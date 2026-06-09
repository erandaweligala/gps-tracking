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
subprojects {
    project.evaluationDependsOn(":app")
}

// ---------------------------------------------------------------------------
// AGP 8+ namespace workaround.
//
// Some plugins were written for the Android Gradle Plugin 7.x era and declare
// their package only via `package="..."` in their AndroidManifest.xml. AGP 8+
// removed that and instead *requires* a `namespace` in the module's build
// script. background_locator_2 (2.0.6) is one such plugin, so the build fails
// with:
//
//     Namespace not specified. Specify a namespace in the module's build file
//     .../background_locator_2-2.0.6/android/build.gradle
//
// Until the plugin ships a fix upstream, inject a namespace for any subproject
// that's missing one, using its Gradle `group` (which for these plugins is the
// same value as the old manifest package, e.g. "rekab.app.background_locator").
//
// The Android extension type isn't on the root build script's compile
// classpath, so access it reflectively to keep this script compiling
// regardless of the AGP version in use.
// ---------------------------------------------------------------------------
subprojects {
    afterEvaluate {
        val androidExtension = project.extensions.findByName("android") ?: return@afterEvaluate
        val getNamespace =
            androidExtension.javaClass.methods.firstOrNull { it.name == "getNamespace" }
                ?: return@afterEvaluate
        if (getNamespace.invoke(androidExtension) == null) {
            val setNamespace =
                androidExtension.javaClass.methods.firstOrNull {
                    it.name == "setNamespace" && it.parameterCount == 1
                } ?: return@afterEvaluate
            setNamespace.invoke(androidExtension, project.group.toString())
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
