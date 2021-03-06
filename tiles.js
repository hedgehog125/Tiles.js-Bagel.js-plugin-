{
    // TODO: Idle animation support
    // Multiple keys per action
    info: {
        id: "Tiles",
        description: "A flexible tile engine for Bagel.js"
    },
    plugin: {
        listeners: {
            prepState: (state, game) => {
                for (let i in game.game.sprites) {
                    let sprite = game.game.sprites[i];
                    if (sprite) {
                        if (sprite.type == "tileEngine") {
                            if (sprite.state == state) {
                                Bagel.get.asset.img(sprite.levelPrefix + sprite.level); // Trigger the loading
                                Bagel.get.asset.spritesheet(sprite.tilesheet); // Trigger the loading
                            }
                        }
                    }
                }
            }
        },
        types: {
            sprites: {
                tileEngine: {
                    args: {
                        tilesheet: {
                            required: true,
                            types: ["string"],
                            description: "The id of the spritesheet to use for the tiles. (excluding the dot)"
                        },
                        tileProperties: {
                            required: false,
                            default: {},
                            types: ["object"],
                            check: (value, sprite, name, game, prev, args) => {
                                for (let i in value) {
                                    Bagel.check({
                                        ob: value[i],
                                        where: args.where + "." + i,
                                        syntax: {
                                            hitbox: {
                                                required: false,
                                                default: [],
                                                subcheck: {
                                                    x: {
                                                        required: true,
                                                        types: ["number"],
                                                        description: "The x offset of this hitbox in tiles from the top left corner."
                                                    },
                                                    y: {
                                                        required: true,
                                                        types: ["number"],
                                                        description: "The x offset of this hitbox in tiles from the top left corner."
                                                    },
                                                    width: {
                                                        required: true,
                                                        types: ["number"],
                                                        description: "The width of this hitbox in tiles."
                                                    },
                                                    height: {
                                                        required: true,
                                                        types: ["number"],
                                                        description: "The height of this hitbox in tiles."
                                                    }
                                                },
                                                checkEach: true,
                                                types: ["array"],
                                                description: "The hitbox for the tile. It's an array of rectangles and their positions relative to the tile in tiles, along with their widths and heights in tiles. There can be multiple hitboxes for each tile."
                                            }
                                        }
                                    }, Bagel.internal.checks.disableArgCheck, true);
                                }
                                // The properties for unspecified tiles are added later
                            },
                            description: "Contains the properties of the different tiles."
                        },
                        levelPrefix: {
                            required: true,
                            types: ["string"],
                            description: "The prefix for the ids of levels. e.g if it was \"Level\" then the image for the first level would need to be \"Level0\"."
                        },
                        level: {
                            required: false,
                            default: 0,
                            types: ["number"],
                            description: "The current level number, starting at 0."
                        },
                        levels: {
                            required: true,
                            subcheck: {
                                palette: {
                                    required: true,
                                    types: ["object"],
                                    description: "An object where the keys are the hex (rgba) colours (without a hashtag) and their values are the tile IDs."
                                },
                                start: {
                                    required: false,
                                    default: {},
                                    subcheck: {
                                        player: {
                                            required: false,
                                            default: {},
                                            subcheck: {
                                                x: {
                                                    required: false,
                                                    default: 0,
                                                    types: ["number"],
                                                    description: "The starting x position for the sprite."
                                                },
                                                y: {
                                                    required: false,
                                                    default: 0,
                                                    types: ["number"],
                                                    description: "The starting y position for the sprite."
                                                }
                                            },
                                            types: ["object"],
                                            description: "The starting coordinates for the player."
                                        },
                                        camera: {
                                            required: false,
                                            default: {},
                                            subcheck: {
                                                x: {
                                                    required: false,
                                                    default: 0,
                                                    types: ["number"],
                                                    description: "The starting x position for the camera."
                                                },
                                                y: {
                                                    required: false,
                                                    default: 0,
                                                    types: ["number"],
                                                    description: "The starting y position for the camera."
                                                }
                                            },
                                            types: ["object"],
                                            description: "The starting coordinates for the camera."
                                        }
                                    },
                                    types: ["object"],
                                    description: "The starting positions for a few things."
                                }
                            },
                            arrayLike: true,
                            types: ["array"],
                            description: "The JSON for each level."
                        },
                        tileResolution: {
                            required: true,
                            types: ["number"],
                            description: "The resolution of the tiles. e.g 16 means the tiles are 16x16."
                        },
                        state: {
                            required: true,
                            types: ["string"],
                            description: "The state for this sprite to be active."
                        }
                    },
                    cloneArgs: null,
                    check: sprite => { // This isn't actually checking anything, it just creates the scripts needed
                        sprite.scripts.init.push({
                            code: me => {
                                let camera = me.levels[me.level].start.camera;
                                me.camera = {
                                    x: camera.x,
                                    y: camera.y,
                                    zoom: 1,
                                    zoomVel: 0
                                };
                                me.internal.baseCamera = {
                                    x: camera.x,
                                    y: camera.y
                                };

                                // Add in the properties for the tiles that were unspecified now everything's loaded
                                let tilesheet = Bagel.get.asset.spritesheet(me.tilesheet);
                                let y = 0;
                                while (y < tilesheet.animations.length) {
                                    let x = 0;
                                    while (x < tilesheet.frames[y]) {
                                        let tileID = tilesheet.animations[y] + "." + x;
                                        if (me.tileProperties[tileID] == null) {
                                            me.tileProperties[tileID] = {
                                                hitbox: [{
                                                    x: 0,
                                                    y: 0,
                                                    width: 1,
                                                    height: 1
                                                }]
                                            };
                                        }
                                        x++;
                                    }
                                    y++;
                                }

                                me.internal.prerender(me); // Prerender the tiles
                            },
                            stateToRun: sprite.state
                        });
                        sprite.scripts.main.push({
                            code: me => {
                                let camera = me.camera;
                                camera.x = me.internal.baseCamera.x + ((game.input.mouse.x - (game.width / 2)) / me.tileResolution);
                                camera.y = me.internal.baseCamera.y + ((game.input.mouse.y - (game.height / 2)) / me.tileResolution);

                                let targetZoom = Math.max(game.width, game.height) / Math.min(me.internal.canvas.width, me.internal.canvas.height);
                                if (camera.zoom != targetZoom) {
                                    if (camera.zoom > targetZoom) {
                                        camera.zoomVel -= 0.05;
                                        camera.zoom += camera.zoomVel;
                                        camera.zoomVel *= 0.95;
                                        if (camera.zoom <= targetZoom) { // Past it
                                            camera.zoomVel = 0;
                                            camera.zoom = targetZoom;
                                        }
                                    }
                                    else {
                                        camera.zoomVel += 0.05;
                                        camera.zoom += camera.zoomVel;
                                        camera.zoomVel *= 0.95;
                                        if (camera.zoom >= targetZoom) { // Past it
                                            camera.zoomVel = 0;
                                            camera.zoom = targetZoom;
                                        }
                                    }
                                }

                            },
                            stateToRun: sprite.state
                        });
                    },
                    init: sprite => {
                        let internal = sprite.internal;

                        internal.canvas = document.createElement("canvas");
                        internal.ctx = internal.canvas.getContext("2d");
                        internal.dataCanvas = document.createElement("canvas"); // For getting the image data
                        internal.dataCtx = internal.dataCanvas.getContext("2d");
                        internal.prerender = me => {
                            let internal = me.internal;
                            let canvas = internal.canvas;
                            let ctx = internal.ctx;
                            let dataCanvas = internal.dataCanvas;
                            let dataCtx = internal.dataCtx;

                            let img = Bagel.get.asset.img(me.levelPrefix + me.level, me.game, true);
                            if (typeof img == "boolean") {
                                if (! img) {
                                    console.error("Oops, the image " + JSON.stringify(me.levelPrefix + me.level) + " doesn't exist. You might want to check your prefix and if you've loaded that asset or not.");
                                }
                                return;
                            }
                            dataCanvas.width = img.width;
                            dataCanvas.height = img.height;
                            canvas.width = img.width * me.tileResolution;
                            canvas.height = img.height * me.tileResolution;

                            dataCtx.clearRect(0, 0, dataCanvas.width, dataCanvas.height);
                            ctx.clearRect(0, 0, canvas.width, canvas.height);

                            dataCtx.drawImage(img, 0, 0, img.width, img.height);
                            let data = dataCtx.getImageData(0, 0, dataCanvas.width, dataCanvas.height);
                            let level = me.levels[me.level];
                            let tiles = {};
                            let i = 0;
                            while (i < data.data.length) {
                                let x = (i / 4) % data.width;
                                let y = Math.floor((i / 4) / data.width);

                                let hex = Bagel.maths.hex;
                                let tile = hex(data.data[i]) + hex(data.data[i + 1]) + hex(data.data[i + 2]) + hex(data.data[i + 3]);
                                if (level.palette[tile] == null) {
                                    console.error("Oops, there's no tile for the colour " + JSON.stringify(tile) + " in " + JSON.stringify(me.id) + "'s \"palette\" argument.");
                                    Bagel.internal.oops(game);
                                }
                                tile = level.palette[tile];
                                tiles[x + "," + y] = tile;
                                tile = Bagel.get.asset.img(me.tilesheet + "." + tile);

                                ctx.drawImage(tile, x * me.tileResolution, y * me.tileResolution, me.tileResolution, me.tileResolution);
                                i += 4;
                            }

                            me.width = img.width;
                            me.height = img.height;
                            me.tiles = tiles;
                        };
                    },
                    render: {
                        ctx: (sprite, ctx, canvas, game, plugin, scaleX, scaleY) => {
                            let camera = sprite.camera;
                            ctx.scale(scaleX, scaleY);
                            ctx.fillStyle = "black";
                            ctx.fillRect(0, 0, game.width, game.height);

                            let width = sprite.internal.canvas.width * camera.zoom;
                            let height = sprite.internal.canvas.height * camera.zoom;

                            ctx.drawImage(sprite.internal.canvas, ((game.width - width) / 2) - (camera.x * sprite.tileResolution), ((game.height - height) / 2) - (camera.y * sprite.tileResolution), width, height);
                        },
                        //clean: true
                    },
                    description: "A tile renderer sprite."
                },
                tilePlayer: {
                    args: {
                        tileEngine: {
                            required: true,
                            types: ["string"],
                            check: (value, sprite, property, game) => {
                                if (! Bagel.get.sprite(value, game, true)) {
                                    return "Oops, the sprite you specified for this argument doesn't seem to exist. Make sure you spelt it correctly.";
                                }
                                if (Bagel.get.sprite(value).type != "tileEngine") {
                                    return "Huh, looks like the tileEngine sprite you specified for this player sprite isn't a \"tileEngine\" sprite, check you've got the right id.";
                                }
                            },
                            description: "The id of the \"tileEngine\" sprite. This sprite will link to the sprite specified."
                        },
                        imgPrefix: {
                            required: true,
                            types: ["string"],
                            description: "The prefix of the image for the player sprite. (excluding the ending dot)"
                        },
                        animations: {
                            required: true,
                            subcheck: {
                                idle: {
                                    required: true,
                                    subcheck: {
                                        prefix: {
                                            required: true,
                                            types: ["string"],
                                            description: "The prefix for the idle animation frames. (excluding the dot)"
                                        },
                                        frames: {
                                            required: true,
                                            check: value => {
                                                if (! Number.isInteger(value)) {
                                                    return "Huh, looks like you tried to use a float (a number with a decimal place) instead of an interger (a whole number). Maybe it's a typo. You tried to use " + value + ".";
                                                }
                                                if (value < 1) {
                                                    return "Oops, this has to be at least one. You tried to use " + value + ".";
                                                }
                                            },
                                            types: ["number"],
                                            description: "The number of frames for this animation."
                                        }
                                    },
                                    types: ["object"],
                                    description: "Contains some options for the idle animation."
                                }
                            },
                            types: ["object"],
                            description: "Contains the different animations for the player."
                        },
                        physics: {
                            required: true,
                            subcheck: {
                                enable: {
                                    required: false,
                                    default: true,
                                    types: ["boolean"],
                                    description: "If the physics should be enabled or not."
                                },
                                gravity: {
                                    required: true,
                                    types: ["number"],
                                    description: "The strength of gravity."
                                },
                                friction: {
                                    required: true,
                                    types: ["number"],
                                    description: "The amount to multiply the x and y velocities by to create friction. Higher numbers mean less friction. You probably shouldn't set it above 1."
                                },
                                airResistance: {
                                    required: true,
                                    types: ["number"],
                                    description: "The amount to multiply the x and y velocities by to create air resistance. Higher numbers mean less resistance. You probably shouldn't set it above 1."
                                },
                                controls: {
                                    required: true,
                                    subcheck: {
                                        speed: {
                                            required: true,
                                            types: ["number"],
                                            description: "The speed that the character accelerates and moves when a horizontal direction is pressed."
                                        },
                                        keys: {
                                            required: false,
                                            default: {},
                                            subcheck: {
                                                up: {
                                                    required: false,
                                                    default: 87,
                                                    types: [
                                                        "number",
                                                        "string"
                                                    ],
                                                    check: (value, ob, name, game) => {
                                                        if (typeof value == "string") {
                                                            if (game.input.lookup[value] == null) {
                                                                console.log(game.input.lookup);
                                                                return "Oops, I don't know that key :/ Have a look at the keys in that lookup object or try using an ASCII code. You tried to use " + JSON.stringify(value) + ".";
                                                            }
                                                            ob[name] = game.input.lookup[value];
                                                        }
                                                    },
                                                    description: "The key for the up action. Can be an ASCII code or a named key (if it's in game.input.lookup)."
                                                },
                                                down: {
                                                    required: false,
                                                    default: 83,
                                                    types: [
                                                        "number",
                                                        "string"
                                                    ],
                                                    check: (value, ob, name, game) => {
                                                        if (typeof value == "string") {
                                                            if (game.input.lookup[value] == null) {
                                                                console.log(game.input.lookup);
                                                                return "Hmm, I don't know that key :/ Have a look at the keys in that lookup object or try using an ASCII code. You tried to use " + JSON.stringify(value) + ".";
                                                            }
                                                            ob[name] = game.input.lookup[value];
                                                        }
                                                    },
                                                    description: "The key for the down action. Can be an ASCII code or a named key (if it's in game.input.lookup)."
                                                },
                                                left: {
                                                    required: false,
                                                    default: 65,
                                                    types: [
                                                        "number",
                                                        "string"
                                                    ],
                                                    check: (value, ob, name, game) => {
                                                        if (typeof value == "string") {
                                                            if (game.input.lookup[value] == null) {
                                                                console.log(game.input.lookup);
                                                                return "Erm, I don't know that key :/ Have a look at the keys in that lookup object or try using an ASCII code. You tried to use " + JSON.stringify(value) + ".";
                                                            }
                                                            ob[name] = game.input.lookup[value];
                                                        }
                                                    },
                                                    description: "The key for the left action. Can be an ASCII code or a named key (if it's in game.input.lookup)."
                                                },
                                                right: {
                                                    required: false,
                                                    default: 68,
                                                    types: [
                                                        "number",
                                                        "string"
                                                    ],
                                                    check: (value, ob, name, game) => {
                                                        if (typeof value == "string") {
                                                            if (game.input.lookup[value] == null) {
                                                                console.log(game.input.lookup);
                                                                return "Huh, I don't know that key :/ Have a look at the keys in that lookup object or try using an ASCII code. You tried to use " + JSON.stringify(value) + ".";
                                                            }
                                                            ob[name] = game.input.lookup[value];
                                                        }
                                                    },
                                                    description: "The key for the right action. Can be an ASCII code or a named key (if it's in game.input.lookup)."
                                                }
                                            },
                                            types: ["object"],
                                            description: "The keys and keycodes for different actions. Defaults to WASD."
                                        }
                                    },
                                    types: ["object"],
                                    description: "Some options for in-game controls."
                                }
                            },
                            types: ["object"],
                            description: "A bunch of options for physics for the character."
                        },
                        alpha: {
                            required: false,
                            default: 1,
                            types: ["number"],
                            description: "The alpha of the character. 1 is fully visible, 0.5 is partially and 0's invisible."
                        },
                        width: {
                            required: true,
                            types: ["number"],
                            description: "The width in tiles of the character."
                        },
                        height: {
                            required: true,
                            types: ["number"],
                            description: "The height in tiles of the character."
                        }
                    },
                    cloneArgs: null,
                    check: sprite => {
                        sprite.tileEngine = Bagel.get.sprite(sprite.tileEngine);
                        sprite.state = sprite.tileEngine.state;
                        sprite.scripts.init.push({
                            code: me => {
                                let level = sprite.tileEngine.levels[sprite.tileEngine.level];

                                sprite.x = level.start.player.x;
                                sprite.y = level.start.player.y;
                                sprite.img = sprite.imgPrefix + "." + sprite.animations.idle.prefix + ".0";

                                me.vars.touchingGround = me => {
                                    let x = (me.x + (me.tileEngine.width / 2)) - (me.width / 2);
                                    let y = me.y + (me.tileEngine.height / 2);

                                    let i = 0;
                                    while (i < me.width) {
                                        if (me.vars.touchingTile(me, Math.round(x + i), Math.round(y + (me.height / 2)), x + i, y - (me.height / 2))) {
                                            return true;
                                        }
                                        i++;
                                    }
                                    return false;
                                };
                                me.vars.touchingTile = (me, x, y, leftX, leftY) => {
                                    let tileID = me.tileEngine.tiles[x + "," + y];
                                    if (tileID == null) { // No tile
                                        return false;
                                    }
                                    let tile = me.tileEngine.tileProperties[tileID];
                                    for (let i in tile.hitbox) {
                                        let box = tile.hitbox[i];
                                        let boxX = x + box.x;
                                        let boxY = y + box.y;

                                        if (boxX < leftX + me.width) {
                                            if (boxX + box.width > leftX) {
                                                if (boxY < leftY + me.height) {
                                                    if (boxY + box.height > leftY) {
                                                        return true;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    return false;
                                };
                            },
                            stateToRun: sprite.state
                        });
                        sprite.scripts.main.push({
                            code: (me, game, step) => {
                                step("Tile.js controls");
                                step("Tile.js physics");
                            },
                            stateToRun: sprite.state
                        });
                        sprite.scripts.steps["Tile.js controls"] = me => {
                            let isDown = game.input.keys.isDown;
                            let controls = me.physics.controls;
                            let controlKeys = controls.keys;

                            if (isDown(controlKeys.left)) {
                                me.vel.x -= controls.speed;
                            }
                            if (isDown(controlKeys.right)) {
                                me.vel.x += controls.speed;
                            }
                        };
                        sprite.scripts.steps["Tile.js physics"] = me => {
                            if (me.physics.enable) {
                                let onGround;
                                if (me.vars.touchingGround(me)) {
                                    me.vel.y = 0;
                                    onGround = true;
                                    while (me.vars.touchingGround(me)) {
                                        me.y -= me.tileEngine.tileResolution;
                                    }
                                    me.y += me.tileEngine.tileResolution;
                                }
                                else {
                                    me.vel.y += me.physics.gravity;
                                    onGround = false;
                                }

                                let res = me.tileEngine.tileResolution;
                                me.x += me.vel.x / res;
                                me.y += me.vel.y / res;
                                if (onGround) {
                                    me.vel.x *= me.physics.friction;
                                    me.vel.y *= me.physics.friction;
                                }
                                me.vel.x *= me.physics.airResistance;
                                me.vel.y *= me.physics.airResistance;
                            }
                        };
                    },
                    init: sprite => {
                        sprite.vel = {
                            x: 0,
                            y: 0
                        };
                    },
                    render: {
                        ctx: (sprite, ctx, canvas, game, plugin, scaleX, scaleY) => {
                            if (sprite.img == null) return; // No image for this sprite
                            let img = Bagel.get.asset.img(sprite.img, game, true);
                            if (typeof img == "boolean") { // It's loading or it doesn't exist
                                if (img) { // Loading
                                    return; // Don't render it this frame, wait until it's loaded
                                }
                                else { // Doesn't exist
                                    console.error("Hmm. The image " + JSON.stringify(sprite.img) + " doesn't seem to exist. The Tiles.js plugin tried to use it as part of an animation for the sprite " + JSON.stringify(sprite.id) + ". Check your \"animation\" argument as well as the \"imgPrefix\" argument. (also they're both case sensitive!)");
                                    Bagel.internal.oops(game);
                                }
                            }

                            ctx.globalAlpha = sprite.alpha;

                            let flipX = sprite.width >= 0? 1 : -1;
                            let flipY = sprite.height >= 0? 1 : -1;
                            scaleX = scaleX * flipX;
                            scaleY = scaleY * flipY;
                            ctx.scale(scaleX, scaleY);

                            let camera = sprite.tileEngine.camera;
                            let res = sprite.tileEngine.tileResolution;
                            let width = sprite.width * res * camera.zoom;
                            let height = sprite.height * res * camera.zoom;

                            ctx.drawImage(
                                img,
                                (((game.width - width) / 2) + (sprite.x * res * camera.zoom) - (camera.x * res)) * flipX,
                                (((game.height - height) / 2) + (sprite.y * res * camera.zoom) - (camera.y * res)) * flipY,
                                width,
                                height
                            );
                            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset the scaling
                            ctx.globalAlpha = 1;
                        },
                        clean: true
                    },
                    description: "A platformer sprite that you can control. Links to a \"tileEngine\" sprite.",
                }
            }
        }
    }
}
