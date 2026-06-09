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

// ---------------------------------------------------------------------------
// AGP 8+ namespace workaround.
//
// Some plugins were written for the Android Gradle Plugin 7.x era and declare
// their package only via `package="..."` in their AndroidManifest.xml. AGP 8+
// removed that and instead *requires* a `namespace` in the module's
// build.gradle. background_locator_2 (2.0.6) is one such plugin, so the build
// fails with:
//
//     Namespace not specified. Specify a namespace in the module's build file
//     .../background_locator_2-2.0.6/android/build.gradle
//
// Until the plugin ships a fix upstream, inject a namespace for any subproject
// that's missing one, using its Gradle `group` (which for these plugins is the
// same value as the old manifest package, e.g. "rekab.app.background_locator").
//
// IMPORTANT: this `afterEvaluate` block is registered *before* the
// `evaluationDependsOn(":app")` block below. `evaluationDependsOn` forces
// `:app` to be evaluated eagerly while the other subprojects are still being
// configured. If the `afterEvaluate` callback were registered after that, it
// would be attached to an already-evaluated `:app` and Gradle would fail with
// "Cannot run Project.afterEvaluate(Action) when the project is already
// evaluated." Reflection is used to avoid needing the AGP types on the root
// project's buildscript classpath.
// ---------------------------------------------------------------------------
subprojects {
    afterEvaluate {
        val androidExtension = extensions.findByName("android") ?: return@afterEvaluate
        val getNamespace = androidExtension.javaClass.getMethod("getNamespace")
        if (getNamespace.invoke(androidExtension) == null) {
            val setNamespace =
                androidExtension.javaClass.getMethod("setNamespace", String::class.java)
            setNamespace.invoke(androidExtension, project.group.toString())
        }
    }
}

subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
