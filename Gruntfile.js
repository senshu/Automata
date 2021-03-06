/* jshint node:true */

module.exports = function(grunt) {
    "use strict";

    var nunjucks = require('nunjucks');

    grunt.registerMultiTask("nunjucks-render", function () {
        var result = nunjucks.render(this.data.src, this.data.context);
        grunt.file.write(this.data.dest, result);
        grunt.log.writeln('File ' + this.data.dest + ' created.');
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks("grunt-contrib-cssmin");
    grunt.loadNpmTasks("grunt-nunjucks");
    grunt.loadNpmTasks("grunt-contrib-connect");
    grunt.loadNpmTasks('grunt-zip');
    grunt.loadNpmTasks("grunt-rsync");
    grunt.loadNpmTasks('grunt-jsdoc');

    var version = grunt.template.today("yy.mm.ddHHMM");

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        jshint: {
            options: {
                jshintrc: true
            },
            all: [
                "js/**/*.js",
                "games/**/*.js"
            ]
        },

        jsdoc: {
            core: {
                options: {
                    destination: "build/doc/",
                    configure: "jsdoc-conf.json"
                },
                src: [
                    "js/**/*.js",
                    "games/**/*.js"
                ]
            }
        },

        nunjucks: {
            core: {
                src: "templates/*",
                dest: "build/tmp/automata.templates.js"
            }
        },

        uglify: {
            options: {
                //mangle: false,
                //beautify: true
            },
            core: {
                src: [
                    'js/namespace.js',
                    'js/main.js',
                    'js/shims/*.js',

                    'js/model/Object.js',
                    'js/view/View.js',

                    'js/model/State.js',
                    'js/model/Transition.js',
                    'js/model/StateMachine.js',
                    'js/model/World.js',

                    'js/view/TransitionTable.js',
                    'js/view/ControlView.js',
                    'js/view/HelpView.js',
                    'js/view/ScoreView.js',
                    'js/view/Diagram.js',

                    'js/storage/LocalStorage.js',
                    "<%= nunjucks.core.dest %>"
                ],
                dest: 'build/dist/js/automata.core.min.js'
            }
        },

        cssmin: {
            core: {
                src: [
                    "css/main.css",
                    "css/booleans.css",
                    "css/games-menu.css",
                    "css/TransitionTable.css",
                    "css/Diagram.css",
                    "css/Score.css",
                    "css/Help.css",
                    "css/Control.css"
                ],
                dest: "build/dist/css/automata.core.min.css"
            }
        },

        copy: {
            core: {
                files: [
                    {src: "fonts/Arsenal/*.otf", dest: "build/dist/"},
                    {src: "bower_components/**/*", dest: "build/dist/"},
                    {src: "icons/*.png", dest: "build/dist/"},
                    {src: "install.html", dest: "build/pkg/"},
                    {src: "js/webapp.js", dest: "build/dist/"}
                ]
            }
        },

        "nunjucks-render": {
            "manifest.webapp":  {src: "manifest.webapp",  dest: "build/dist/manifest.webapp", context: {version: version}},
            "package.manifest": {src: "package.manifest", dest: "build/pkg/package.manifest", context: {version: version}}
        },

        connect: {
            server: {
                options: {
                    port: 8000,
                    base: "build/dist",
                    keepalive: true
                }
            }
        },

        rsync: {
            options: {
                args: ["--verbose", "--update"]
            },
            dist: {
                options: {
                    src: ["build/dist/", "build/pkg/"],
                    dest: "/var/www/logique/automata/",
                    host: "www-data@tice.sea.eseo.fr",
                    port: "2204",
                    syncDest: true,
                    recursive: true
                }
            }
        },

        zip: {
            webapp: {
                src: "build/dist/**/*",
                dest: "build/pkg/Automata.zip",
                cwd: "build/dist"
            }
        }
    });

    function rebase(dir, fileName) {
        var cRebase = function (cFileName) {
            return dir + "/" + cFileName;
        };
        if (fileName === undefined){
            return cRebase;
        }
        else {
            return cRebase(fileName);
        }
    }

    var indexData = { categories: [] };
    var categoryList = grunt.file.readJSON("games/list.json");
    for (var catIndex = 0; catIndex < categoryList.contents.length; catIndex ++) {
        var catDir = "games/" + categoryList.contents[catIndex];
        var gamesList = grunt.file.readJSON(catDir + "/list.json");
        var indexCatData = {
            title: gamesList.title,
            games: []
        };
        indexData.categories.push(indexCatData);

        for (var gameIndex = 0; gameIndex < gamesList.contents.length; gameIndex ++) {
            var gameDir = catDir + "/" + gamesList.contents[gameIndex];
            var gameData = grunt.file.readJSON(gameDir + "/game.json");
            var gameHelp = gameData.help ? grunt.file.read(gameDir + "/" + gameData.help) : "";
            var gameKey = categoryList.id + "." + gamesList.id + "." + gameData.id;

            indexCatData.games.push({
                key: gameKey,
                title: gameData.title
            });

            grunt.config.set(["uglify", gameKey], {
                src: gameData.js.map(rebase(gameDir)),
                dest: "build/dist/js/" + gameKey + ".min.js"
            });

            grunt.config.set(["cssmin", gameKey], {
                src:  gameData.css.map(rebase(gameDir)),
                dest: "build/dist/css/" + gameKey + ".min.css"
            });

            grunt.config.set(["nunjucks-render", gameKey], {
                src: "templates/game.tpl.html",
                context: {
                    key: gameKey,
                    title: gameData.title,
                    content: gameHelp
                },
                dest: "build/dist/" + gameKey + ".html"
            });

            grunt.config.set(["copy", gameKey], {
                src: rebase(gameDir, gameData.icon),
                dest: "build/dist/icons/" + gameKey + ".svg"
            });
        }
    }

    grunt.config.set(["nunjucks-render", "index"], {
        src: "templates/index.tpl.html",
        context: indexData,
        dest: "build/dist/index.html"
    });

    grunt.registerTask('default', ["nunjucks", "uglify", "cssmin", "nunjucks-render", "copy", "zip"]);
};
