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

// Some older Flutter plugins (e.g. background_locator_2) don't declare an Android
// `namespace`, which Android Gradle Plugin 8.x requires. Inject one derived from the
// plugin's AndroidManifest `package` attribute so the build doesn't fail.
subprojects {
    afterEvaluate {
        if (project.hasProperty("android")) {
            val androidExtension = project.property("android") ?: return@afterEvaluate
            val getNamespace = androidExtension.javaClass.getMethod("getNamespace")
            val currentNamespace = getNamespace.invoke(androidExtension) as String?
            if (currentNamespace == null) {
                val manifestFile = project.file("src/main/AndroidManifest.xml")
                if (manifestFile.exists()) {
                    val packageName =
                        Regex("""package\s*=\s*["']([^"']+)["']""")
                            .find(manifestFile.readText())
                            ?.groupValues
                            ?.get(1)
                    if (packageName != null) {
                        androidExtension.javaClass
                            .getMethod("setNamespace", String::class.java)
                            .invoke(androidExtension, packageName)
                    }
                }
            }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
