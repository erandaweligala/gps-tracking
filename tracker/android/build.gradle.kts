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

// Register the namespace injection BEFORE forcing evaluation below. If a project has
// already been evaluated, run the logic immediately instead of scheduling afterEvaluate
// (which Gradle rejects once a project is evaluated).
subprojects {
    if (state.executed) {
        injectMissingNamespace()
    } else {
        afterEvaluate {
            injectMissingNamespace()
        }
    }
}

// Some older Flutter plugins (e.g. background_locator_2) compile their Kotlin with a
// JVM target of 17 (inherited from the project's Kotlin version) while leaving their
// Java compilation at the legacy default of 1.8. Android Gradle Plugin 8.x rejects this
// mismatch with "Inconsistent JVM-target compatibility". Force every subproject's Java
// compilation to target 17 so it lines up with the Kotlin target.
subprojects {
    tasks.withType<org.gradle.api.tasks.compile.JavaCompile>().configureEach {
        sourceCompatibility = JavaVersion.VERSION_17.toString()
        targetCompatibility = JavaVersion.VERSION_17.toString()
    }
}

subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
