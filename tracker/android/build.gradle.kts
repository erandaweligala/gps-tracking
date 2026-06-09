allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}

// Some older Flutter plugins (e.g. background_locator_2) don't declare an Android
// `namespace`, which Android Gradle Plugin 8.x requires. Inject one derived from the
// plugin's AndroidManifest `package` attribute so the build doesn't fail.
fun Project.injectMissingNamespace() {
    if (!hasProperty("android")) return
    val androidExtension = property("android") ?: return
    val getNamespace = androidExtension.javaClass.getMethod("getNamespace")
    val currentNamespace = getNamespace.invoke(androidExtension) as String?
    if (currentNamespace != null) return
    val manifestFile = file("src/main/AndroidManifest.xml")
    if (!manifestFile.exists()) return
    val packageName =
        Regex("""package\s*=\s*["']([^"']+)["']""")
            .find(manifestFile.readText())
            ?.groupValues
            ?.get(1)
            ?: return
    androidExtension.javaClass
        .getMethod("setNamespace", String::class.java)
        .invoke(androidExtension, packageName)
}

// Some older Flutter plugins (e.g. background_locator_2) don't declare Java
// `compileOptions`, so their Java compilation defaults to target 1.8 while the
// Kotlin 2.x Gradle plugin compiles to JVM target 17. Android Gradle Plugin 8.x
// rejects this mismatch ("Inconsistent JVM-target compatibility"). Align the
// Java source/target compatibility to 17 to match Kotlin so the build succeeds.
fun Project.alignJvmTarget() {
    if (!hasProperty("android")) return
    val androidExtension = property("android") ?: return
    val compileOptions =
        androidExtension.javaClass
            .getMethod("getCompileOptions")
            .invoke(androidExtension) ?: return
    compileOptions.javaClass
        .getMethod("setSourceCompatibility", JavaVersion::class.java)
        .invoke(compileOptions, JavaVersion.VERSION_17)
    compileOptions.javaClass
        .getMethod("setTargetCompatibility", JavaVersion::class.java)
        .invoke(compileOptions, JavaVersion.VERSION_17)
}

// Some older Flutter plugins (e.g. background_locator_2) pin a low
// `compileSdkVersion` (28). Because we align their Java source/target
// compatibility to 17 (Java 9+) above, Android Gradle Plugin requires
// `compileSdkVersion` to be 30 or above ("In order to compile Java 9+ source,
// please set compileSdkVersion to 30 or above"). Bump any subproject below 34 up
// to 34 so the build succeeds.
fun Project.alignCompileSdk() {
    if (!hasProperty("android")) return
    val androidExtension = property("android") ?: return
    val minCompileSdk = 34
    val current =
        (androidExtension.javaClass
            .getMethod("getCompileSdkVersion")
            .invoke(androidExtension) as String?)
            ?.removePrefix("android-")
            ?.toIntOrNull()
    if (current != null && current >= minCompileSdk) return
    androidExtension.javaClass
        .getMethod("setCompileSdkVersion", Int::class.javaPrimitiveType)
        .invoke(androidExtension, minCompileSdk)
}

// background_locator_2 2.0.6's LocationParserUtil.kt builds a `hashMapOf(...)` and
// returns it from a function declared to return `HashMap<Any, Any>`. One of the values,
// `location.provider`, is `String?` (the Android SDK annotates `Location.getProvider()`
// as `@Nullable`). Kotlin 1.x propagated the declared `HashMap<Any, Any>` return type
// into the `hashMapOf(...)` call, but the Kotlin 2.x K2 compiler infers the type from
// the arguments first — yielding `HashMap<String, Comparable<*>? & Serializable?>` (note
// the nullable value type) — which it rejects against `HashMap<Any, Any>` with "Return
// type mismatch", failing `compileDebugKotlin`. Coerce the lone nullable value to a
// non-null `String` so every value is non-null `Any` and the map again conforms to the
// declared return type. The plugin lives in the (ephemeral) pub cache, so re-apply the
// patch on every build; the change is idempotent.
fun Project.patchBackgroundLocatorTypeInference() {
    if (name != "background_locator_2") return
    val source =
        file(
            "src/main/kotlin/yukams/app/background_locator_2/provider/LocationParserUtil.kt",
        )
    if (!source.exists()) return
    val original = source.readText()
    val unpatched = "Keys.ARG_PROVIDER to location.provider"
    // Once patched the value is `(location.provider ?: "")`, which no longer contains the
    // `unpatched` substring, so this is a no-op on subsequent builds (or if upstream
    // changes the call site).
    if (!original.contains(unpatched)) return
    source.writeText(
        original.replace(unpatched, "Keys.ARG_PROVIDER to (location.provider ?: \"\")"),
    )
}

// Register the namespace injection BEFORE forcing evaluation below. If a project has
// already been evaluated, run the logic immediately instead of scheduling afterEvaluate
// (which Gradle rejects once a project is evaluated).
subprojects {
    if (state.executed) {
        injectMissingNamespace()
        alignJvmTarget()
        alignCompileSdk()
        patchBackgroundLocatorTypeInference()
    } else {
        afterEvaluate {
            injectMissingNamespace()
            alignJvmTarget()
            alignCompileSdk()
            patchBackgroundLocatorTypeInference()
        }
    }
}

subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
