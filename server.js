const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// Store game state for multiple rooms
const rooms = {};

// Hardcoded word list for the game (converted to Set to prevent internal duplicates)
const wordList = Array.from(new Set([
    "apple", "banana", "mango", "orange", "grapes", "pineapple", "watermelon", "strawberry", "cherry", "peach",
    "car", "bus", "train", "airplane", "bicycle", "scooter", "truck", "boat", "ship", "helicopter",
    "house", "building", "school", "hospital", "temple", "church", "mosque", "tower", "bridge", "road",
    "dog", "cat", "cow", "horse", "elephant", "tiger", "lion", "monkey", "rabbit", "deer",
    "fish", "shark", "whale", "dolphin", "octopus", "crab", "turtle", "frog", "snake", "lizard",
    "sun", "moon", "star", "cloud", "rain", "rainbow", "thunder", "lightning", "wind", "snow",
    "tree", "flower", "grass", "leaf", "forest", "mountain", "river", "lake", "ocean", "island",
    "pen", "pencil", "eraser", "sharpener", "notebook", "book", "bag", "ruler", "marker", "chalk",
    "chair", "table", "bed", "sofa", "cupboard", "mirror", "door", "window", "fan", "light",
    "phone", "laptop", "computer", "keyboard", "mouse", "camera", "television", "radio", "speaker", "remote",
    "pizza", "burger", "sandwich", "fries", "noodles", "pasta", "rice", "bread", "cake", "donut",
    "egg", "milk", "cheese", "butter", "icecream", "chocolate", "candy", "biscuit", "popcorn", "soup",
    "hat", "cap", "shirt", "pant", "jacket", "sweater", "shoes", "socks", "belt", "tie",
    "clock", "watch", "calendar", "alarm", "timer", "bell", "whistle", "key", "lock", "chain",
    "ball", "bat", "football", "cricket", "basketball", "tennis", "badminton", "hockey", "golf", "volleyball",
    "doctor", "nurse", "teacher", "police", "soldier", "chef", "driver", "pilot", "farmer", "barber",
    "baby", "boy", "girl", "man", "woman", "family", "friend", "student", "player",
    "eye", "ear", "nose", "mouth", "hand", "leg", "foot", "head", "hair", "face",
    "toothbrush", "toothpaste", "soap", "shampoo", "towel", "comb", "bucket", "mug", "brush",
    "gift", "box", "toy", "doll", "teddy", "robot", "car toy", "puzzle", "game", "kite",
    "rocket", "satellite", "planet", "earth", "mars", "jupiter", "galaxy", "astronaut", "spaceship", "alien",
    "flag", "map", "globe", "passport", "ticket", "suitcase", "guide", "hotel",
    "cup", "glass", "plate", "spoon", "fork", "knife", "bowl", "tray", "bottle", "jug",
    "fire", "smoke", "ash", "flame", "candle", "matchstick", "lighter", "stove", "oven", "gas",
    "carpet", "curtain", "pillow", "blanket", "mattress", "bedsheet", "lamp", "switch", "plug", "wire",
    "helmet", "mask", "gloves", "boots", "uniform", "badge", "shield", "sword", "gun",
    "drum", "guitar", "piano", "flute", "violin", "microphone", "music", "song", "dance",
    "heart", "brain", "bone", "blood", "muscle", "skin", "body", "health", "medicine", "tablet",
    "ring", "necklace", "bracelet", "earring", "crown", "jewel", "gold", "silver", "diamond", "coin",
    "shop", "market", "mall", "store", "cart", "bill", "money", "cash", "wallet", "bank",
    "party", "balloon", "decoration", "giftwrap", "ribbon", "surprise", "celebration", "festival",
    "holi", "diwali", "eid", "christmas", "newyear", "rakhi", "ganesh", "navratri", "pongal", "onam",
    "raincoat", "umbrella", "puddle", "storm", "flood", "drought", "heat", "cold", "weather",
    "train station", "airport", "bus stop", "taxi", "signal", "traffic", "road sign", "tunnel", "highway",
    "lion king", "ninja", "pirate", "zombie", "ghost", "vampire", "superhero", "villain", "wizard", "fairy",
    "magic", "wand", "spell", "potion", "book magic", "dragon", "castle", "knight", "king", "queen",
    "ladder", "rope", "hammer", "nail", "screw", "tool", "machine", "engine", "gear",
    "package", "delivery", "courier", "parcel", "stamp", "post", "letter", "mailbox",
    "scissors", "glue", "tape", "paper", "cardboard", "plastic", "metal", "wood", "stone", "brick",
    "school bag", "lunch box", "water bottle", "chalkboard", "desk", "exam", "result", "homework", "project",
    "garden", "park", "playground", "swing", "slide", "seesaw", "bench", "tree house", "fountain", "path",
    "sand", "shell", "wave", "surfboard", "sunbed", "coconut", "umbrella beach", "lighthouse", "boat fishing",
    "hill", "cave", "rock", "snowman", "ski", "rope climb", "hiking", "camping", "tent",
    "campfire", "sleeping bag", "torch", "compass", "adventure", "jungle", "safari", "jeep",
    "tractor", "plough", "field", "crop", "wheat", "rice plant", "farmer hat", "cow milk", "barn",
    "stable", "horse cart", "wheel", "tyre", "fuel", "petrol pump", "garage", "mechanic", "repair",
    "tool kit", "wrench", "spanner", "screwdriver", "hammer tool", "saw", "drill", "machine part", "bolt",
    "nut", "chain gear", "bicycle bell", "pedal", "handle", "seat", "brake", "speedometer", "horn",
    "siren", "ambulance", "fire truck", "police car", "rescue", "stretcher", "hospital bed", "injection", "syringe",
    "thermometer", "stethoscope", "bandage", "plaster", "wheelchair", "crutch", "patient", "doctor coat", "nurse cap",
    "chef hat", "apron", "cooking", "frying pan", "pressure cooker", "kitchen", "sink", "tap", "water flow",
    "pipeline", "tank", "bucket water", "washing", "cleaning", "mop", "broom", "dustbin", "garbage",
    "garbage truck", "recycle", "eco", "plant tree", "save earth", "pollution", "smoke factory", "traffic jam", "crowd", "queue",
    "ticket counter", "cashier", "barcode", "scan", "qr code", "mobile pay", "atm", "swipe machine", "bill receipt",
    "shopping cart", "discount", "sale", "offer", "coupon", "advertisement", "banner", "poster", "signboard", "logo",
    "brand", "company", "office", "desk work", "laptop work", "meeting", "presentation", "chart", "graph",
    "statistics", "data", "report", "file", "folder", "document", "print", "printer", "ink",
    "pen stand", "stapler", "clip", "rubber band", "tape roll", "envelope", "diary", "planner", "calendar page",
    "clock wall", "alarm ringing", "sleep", "dream", "wake up", "morning", "night", "sunrise", "sunset",
    "ant", "bee", "fly", "mosquito", "caterpillar", "worm", "snail", "beetle",
    "sparrow", "pigeon", "crow", "eagle", "parrot", "peacock", "owl", "duck", "hen", "rooster",
    "goat", "sheep", "pig", "buffalo", "camel", "zebra", "giraffe", "panda", "koala", "kangaroo",
    "apple tree", "mango tree", "coconut tree", "palm tree", "cactus", "bush", "plant pot", "seed", "root", "branch",
    "night sky", "cloudy sky", "windy sky", "rainbow arc", "falling rain", "snowflake", "ice", "fog",
    "river bank", "small pond", "big lake", "deep ocean", "island shore", "beach sand", "mountain peak", "green hill",
    "cupcake", "muffin", "pancake", "waffle", "sandwich bread", "hotdog", "fries box", "juice glass", "milk bottle", "tea cup",
    "salt", "sugar", "pepper", "spice", "sauce", "ketchup", "mustard", "jam", "honey", "butter knife",
    "spoon set", "fork set", "plate stack", "bowl set", "water jug", "glass cup", "tray plate", "tiffin", "thermos",
    "shirt pocket", "jeans pant", "school uniform", "hoodie", "cap hat", "sunglasses", "watch band", "shoes pair",
    "bed pillow", "soft blanket", "wooden table", "plastic chair", "glass window", "metal door", "floor mat", "lamp light",
    "pen cap", "pencil box", "notebook page", "chalk piece", "whiteboard", "blackboard", "marker pen", "eraser dust", "ruler scale",
    "toy ball", "toy train", "toy plane", "toy robot", "teddy bear", "doll house", "puzzle cube", "spinning top", "kite string",
    "football goal", "cricket bat", "tennis racket", "badminton shuttle", "hockey stick", "basketball hoop", "golf ball", "volleyball net", "bowling pins", "chess board",
    "phone charger", "usb cable", "laptop bag", "computer screen", "keyboard keys", "mouse pad", "camera lens", "tv screen", "remote control", "speaker box",
    "bus ticket", "train ticket", "airplane ticket", "travel bag", "suitcase wheels", "passport cover", "map paper", "guide book", "hotel key", "taxi cab",
    "nurse dress", "police uniform", "soldier uniform", "driver seat",
    "baby bottle", "baby toy", "baby blanket", "baby shoes", "baby bed", "baby smile", "baby cry", "baby crawl", "baby sleep", "baby laugh",
    "hand glove", "face mask", "eye glasses", "ear phone", "nose ring", "hair brush", "tooth brush", "soap bar", "shampoo bottle", "towel cloth",
    "ribbon bow", "wrapping paper", "birthday card", "greeting card", "photo frame", "wall picture", "family photo", "selfie stick", "camera flash",
    "space suit", "moon rock", "star shape", "planet ring", "earth globe", "mars ball", "astronaut helmet", "alien face", "spaceship toy",
    "flag pole", "country flag", "school flag", "white flag", "red flag", "blue flag", "green flag", "signal flag", "warning sign", "traffic cone",
    "book shelf", "study table", "office chair", "desk lamp", "paper stack", "printer paper", "ink bottle", "stapler pin", "paper clip",
    "shop board", "store sign", "market stall", "street vendor", "fruit basket", "vegetable crate", "weighing scale", "cash box", "money note", "coin pile",
    "cake slice", "chocolate bar", "candy stick", "ice cream cone", "popcorn box", "biscuit pack", "bread loaf", "cheese slice", "egg tray", "milk pack",
    "rain drop", "water splash", "mud puddle", "snow ball", "ice cube", "wind swirl", "thunder cloud", "lightning bolt", "sunny day", "cloudy day",
    "tree leaf", "green grass", "dry leaf", "flower pot", "rose flower", "sunflower", "lotus flower", "tulip flower", "garden bench", "park path",
    "bench seat", "swing set", "slide stairs", "seesaw plank", "playground sand", "park tree", "walking path", "running track", "water fountain", "garden gate",
    "beach umbrella", "beach chair", "sand bucket", "sand shovel", "sea shell", "wave splash", "boat oar", "fishing rod", "fish hook", "net basket",
    "mountain path", "hill road", "cave entrance", "rock pile", "snow hill", "ski stick", "hiking bag", "tent pole", "campfire wood",
    "tent cloth", "torch light", "compass needle", "map line", "jungle tree", "safari jeep", "animal track", "forest path", "wild grass",
    "tractor wheel", "plough tool", "wheat crop", "rice field", "corn plant", "farmer stick", "cow shed", "barn door", "hay stack", "water well",
    "bull cart", "wooden wheel", "tyre mark", "fuel tank", "car jack", "spare tyre",
    "nail box", "screw box", "wrench tool", "spanner set", "screwdriver set", "saw blade", "drill bit", "metal rod",
    "paint brush", "paint bucket", "color palette", "drawing paper", "sketch pen", "crayon box", "color pencil", "art board", "wall paint", "house paint",
    "drum stick", "guitar string", "piano key", "flute hole", "violin bow", "music note", "song list", "dance step", "stage light", "mic stand",
    "heart shape", "brain shape", "bone shape", "blood drop", "muscle arm", "skin tone", "body shape", "health kit", "medicine strip", "pill bottle",
    "ring finger", "necklace chain", "bracelet band", "earring pair", "crown head", "jewel box", "gold coin", "silver coin", "diamond ring", "treasure box",
    "wallet pocket", "money bag", "bank card", "atm card", "shopping bag", "cart wheel", "discount tag", "sale sign", "offer board",
    "balloon string", "party hat", "decoration light", "celebration banner", "festival lamp", "diya light", "cracker spark",
    "raincoat hood", "umbrella handle", "boots pair", "puddle jump", "storm cloud", "flood water", "drought land", "hot sun", "cold wind", "weather icon",
    "train engine", "airport gate", "taxi stand", "bridge rail", "highway lane", "crossing line",
    "ninja mask", "pirate hat", "zombie hand", "ghost sheet", "vampire teeth", "superhero cape", "villain mask", "wizard hat", "fairy wings",
    "spell book", "potion bottle", "dragon egg", "castle wall", "knight helmet", "king crown", "queen dress", "sword blade", "shield cover", "battle flag",
    "ladder step", "rope knot", "chain link", "hammer hit", "nail fix", "screw turn", "tool box", "machine gear", "wheel spin",
    "box package", "delivery van", "courier bag", "parcel tape", "stamp mark", "post box", "letter paper", "mailbox slot", "envelope seal", "address label",
    "scissors cut", "glue stick", "paper sheet", "cardboard box", "plastic bag", "metal plate", "wooden plank", "stone block", "brick wall",
    "school desk", "uniform dress", "chalkboard dust", "exam paper", "result sheet", "homework book", "class room", "school bell",
    "garden swing", "park slide", "seesaw play", "bench rest", "fountain water", "flower bed", "green lawn", "park gate",
    "shell pile", "sea wave", "surf board", "sun hat", "coconut drink", "umbrella shade", "lighthouse tower", "ocean view",
    "mountain snow", "hill climb", "cave dark", "rock climb", "snowman face", "ski board", "hiking trail", "camping tent", "forest camp",
    "abacus", "anchor", "anvil", "antenna", "arcade", "armor", "arrow", "ashtray", "asteroid",
    "backpack", "badge", "bakery", "bandage", "barcode", "barrel", "basket", "battery", "beacon",
    "beaker", "bedframe", "bellboy", "binoculars", "blueprint", "blender", "blower",
    "bookmark", "boomerang", "border", "bottlecap", "bowtie", "briefcase",
    "buckle", "bulldozer", "bunker", "busstop", "button", "cable", "calculator", "camcorder",
    "camouflage", "cannon", "canoe", "canvas", "capsule", "carseat", "cartwheel", "cassette", "catapult",
    "ceiling", "cellphone", "cement", "chainlink", "chandelier", "checklist", "chimney", "chisel", "clipboard",
    "clocktower", "clothespin", "coaster", "cockpit", "coil", "concrete", "conveyor", "cookiejar",
    "cooler", "cork", "corkscrew", "counter", "crank", "crate", "crayon", "crosswalk", "crowbar",
    "crystal", "cubicle", "curtain", "cushion", "cutlery", "cylinder", "dashboard", "database", "deckchair", "decoder",
    "dental", "desktop", "detergent", "dialpad", "dictionary", "dinghy", "diploma", "diskette", "dispenser", "divider",
    "dome", "doorknob", "doormat",
    "drainpipe", "drawer", "drillbit", "dustbin", "earplug", "easel", "elevator",
    "escalator", "eyepatch", "faucet", "feather", "fence", "filecabinet", "filter", "firewood", "firewall",
    "flask", "flashlight", "flipchart", "flipper", "flowerpot", "footprint", "forklift",
    "frame", "freezer", "frisbee", "funnel", "fuse", "gadget", "gasmask", "gazebo",
    "gearbox", "generator", "glasses", "glovebox", "gluegun", "goggles", "gong", "grate", "grater", "grid",
    "grinder", "hammock", "handlebar", "hanger", "hardhat", "headset", "heater", "hinge", "holster", "honeycomb",
    "hook", "hourglass", "hydrant", "icebox", "icon", "ignition", "inkpot", "inverter", "iron",
    "jar", "joystick", "jukebox", "jumper", "keypad", "keyring", "kiosk", "kneepad",
    "lantern", "lanyard", "latch", "leafblower", "ledger", "lens", "lifebuoy", "linen", "lockbox",
    "locker", "locket", "logbook", "lounger", "magnet", "mallet", "mannequin",
    "mat", "megaphone", "menu", "meter", "microwave", "milestone", "mixer",
    "mobile", "modem", "monitor", "motor", "mousepad", "napkin", "net", "newspaper",
    "nozzle", "nutcracker", "oar", "oxygen", "paddle", "padlock", "paintbrush", "palette",
    "pan", "panel", "paperclip", "parachute", "pedestal", "penholder", "pencilcase", "pendulum", "peppermill",
    "periscope", "phonecase", "photocopy", "pillowcase", "pinwheel", "pipe", "piston", "pitchfork", "placard", "plank",
    "platform", "pliers", "plunger", "podium", "pointer", "pole", "polish",
    "polybag", "pouch", "powerbank", "pressure", "projector", "propeller", "pulley", "pump",
    "puncher", "puppet", "purse", "pushpin", "pyramid", "quiver", "radar", "radiator", "ramp", "razor",
    "recycler", "reflector", "resistor", "ringlight", "rivet", "roller", "router",
    "saddle", "sandbox", "sanitizer", "satchel", "scanner", "scarf", "scoreboard", "scroll", "seal",
    "seatbelt", "seismograph", "shelf", "shredder", "signboard", "siren",
    "skateboard", "sketchbook", "skullcap", "slider", "sling", "slot", "snare", "snorkel", "socket",
    "solar", "solder", "spatula", "sponge", "spotlight", "sprinkler", "stabilizer", "stamp",
    "stand", "starter", "station", "steam", "stepper", "sticker", "stirrer", "stool", "stopwatch",
    "strainer", "string", "sunshade", "syringe", "tablet", "tag",
    "tarp", "telescope", "terminal", "thread", "throttle",
    "tile", "toaster", "toolbox", "toothpick", "towelrack", "toybox", "trackpad",
    "trailer", "tripod", "trolley", "trunk", "turbine", "turntable", "urinal", "vacuum", "valve",
    "vanity", "vault", "vending", "ventilator", "vest", "vise", "visor", "voltage", "wagon",
    "wardrobe", "washer", "watchtower", "watercan", "waterwheel", "webcam", "windmill",
    "windsock", "workbench", "yardstick", "zipper", "ziplock", "zigzag", "wristband", "wristwatch",
    "backrest", "armrest", "headrest", "footrest", "carmirror", "sideview", "rearview", "windshield", "bumper", "hubcap",
    "gearshift", "seatcover", "headlight", "taillight", "fuelcap", "radiatorcap",
    "brakepad", "clutch", "axle", "muffler", "sparkplug", "odometer",
    "touchscreen", "charger", "adapter", "hotspot",
    "antivirus", "network", "server", "hosting", "domain", "browser", "cookies", "cache",
    "upload", "download", "refresh", "reload", "tab", "recyclebin", "shortcut",
    "clipboard", "screenshot", "wallpaper", "screensaver", "resolution", "brightness", "contrast", "pixel", "widget",
    "directory", "filename", "extension", "format", "template", "spreadsheet", "slide",
    "fax", "qrscan", "receipt", "invoice", "billing", "checkout",
    "wishlist", "cashback", "payment", "transfer", "deposit", "withdraw", "balance",
    "account", "credit", "debit", "interest", "loan", "emi", "savings", "banknote",
    "currency", "exchange", "finance", "budget", "tax", "audit", "profit", "loss", "revenue", "expense",
    "traffic light", "zebra crossing", "speed breaker", "road accident", "car parking", "fuel station", "car wash", "bike repair", "flat tyre", "broken mirror",
    "school bus", "classroom board", "teacher teaching", "student writing", "exam hall", "group study", "science lab", "computer lab",
    "doctor checkup", "hospital room", "patient bed", "nurse helping", "injection time", "blood test", "surgery room", "x ray scan", "ambulance siren", "medicine shop",
    "birthday cake", "candle blowing", "gift opening", "party dance", "balloon burst", "surprise party", "decoration lights", "music party", "photo click", "selfie pose",
    "rainy day", "heavy rain", "thunder storm", "lightning strike", "rainbow sky", "windy weather", "snowfall scene", "foggy morning", "hot summer", "cold winter",
    "mountain climbing", "rock climbing", "river crossing", "boat sailing", "fishing net", "waterfall view", "jungle safari", "wild animal chase", "camping night", "tent setup",
    "tree cutting", "planting tree", "watering plants", "garden cleaning", "grass mowing", "flower picking", "fruit basket", "leaf falling", "autumn season", "spring season",
    "beach walking", "sand castle", "sea waves", "surfing board", "sunbathing", "shell collecting", "lighthouse view",
    "train journey", "airplane landing", "airport security", "luggage checking", "boarding pass", "window seat", "road trip", "map navigation", "car racing",
    "shopping mall", "clothes shopping", "trial room", "billing counter", "discount sale", "online shopping", "parcel delivery", "courier service", "unboxing gift", "return item",
    "mobile charging", "low battery", "phone call", "video call", "texting message", "selfie camera", "social media", "scrolling phone", "gaming mobile", "broken screen",
    "laptop working", "coding laptop", "online class", "zoom meeting", "typing keyboard", "mouse clicking", "printer working", "internet wifi", "network error", "file download",
    "cooking kitchen", "frying egg", "boiling water", "making tea", "baking cake", "chopping vegetables", "washing dishes", "kitchen sink", "gas stove", "burning food",
    "eating dinner", "lunch table", "breakfast time", "drinking juice", "spilling water", "sharing food", "food fight", "restaurant table", "waiter serving", "menu card",
    "cleaning room", "making bed", "folding clothes", "washing machine", "drying clothes", "ironing shirt", "cupboard organizing", "mirror cleaning", "dusting table", "sweeping floor",
    "playing football", "cricket match", "batting shot", "bowling action", "goalkeeper save", "basketball dunk", "tennis serve", "badminton smash",
    "running race", "cycling race", "swimming pool", "diving jump", "gym workout", "weight lifting", "push ups", "yoga pose", "skipping rope", "stretching exercise",
    "police chasing", "thief running", "catching criminal", "handcuffs arrest", "police station", "investigation scene", "fingerprint scan", "evidence finding", "courtroom judge", "lawyer arguing",
    "fire accident", "fire rescue", "water hose", "burning building", "smoke alarm", "emergency exit", "rescue team", "ladder climb", "safety helmet",
    "construction site", "building work", "cement mixing", "brick laying", "hammer hitting", "drilling machine", "crane lifting", "road digging", "repair work", "fixing pipe",
    "painting wall", "color mixing", "brush painting", "drawing art", "sketching face", "canvas painting", "graffiti wall", "spray paint", "art gallery", "exhibition hall",
    "music band", "singing stage", "guitar playing", "drum beating", "piano keys", "dance performance", "concert show", "audience clapping", "microphone stand", "recording studio",
    "movie watching", "cinema hall", "popcorn eating", "film shooting", "camera recording", "director action", "actor acting", "scene shooting", "clapboard", "editing video",
    "robot walking", "flying drone", "toy robot", "machine working", "factory line", "conveyor belt", "assembling parts", "mechanical gear", "engine running",
    "space rocket", "astronaut walking", "moon landing", "planet orbit", "satellite dish", "alien spaceship", "galaxy stars", "telescope view", "zero gravity",
    "magic trick", "magician hat", "rabbit trick", "card trick", "disappearing act", "wizard spell", "flying broom",
    "castle building", "king throne", "queen crown", "knight sword", "horse riding", "battle scene", "war shield", "flag waving", "army march", "victory pose",
    "pirate ship", "treasure hunt", "treasure map", "gold coins", "island escape", "pirate flag", "eye patch", "sword fight", "cannon fire", "buried treasure",
    "zombie walking", "ghost haunting", "haunted house", "scary shadow", "monster attack", "vampire bite", "full moon", "skeleton bones", "spooky tree", "dark forest",
    "superhero flying", "villain fight", "laser power", "shield defense", "superhero mask", "cape flying", "saving people", "city rescue", "explosion scene", "action hero",
    "grocery list", "vegetable market", "fruit vendor", "bargaining price", "cash payment", "digital payment", "bill printing", "queue waiting",
    "office meeting", "business talk", "handshake deal", "presentation slide", "teamwork discussion", "brainstorming ideas", "deadline stress", "office desk", "file organizing", "email sending",
    "bank counter", "money deposit", "atm withdraw", "loan approval", "cheque signing", "safe locker", "account opening", "financial chart", "stock market", "investment plan",
    "school playground", "children playing", "swing pushing", "slide climbing", "seesaw balance", "hide and seek", "catching game", "running kids", "laughing group", "shouting fun",
    "pet dog playing", "cat sleeping", "feeding animals", "walking dog", "bathing dog", "pet grooming", "bird feeding", "fish tank", "aquarium cleaning", "animal shelter",
    "traffic police", "signal control", "whistle blowing", "crossing road", "helmet wearing", "accident help", "road safety", "traffic fine",
    "reading book", "writing diary", "studying late", "exam tension", "result day", "passing exam", "failing exam", "celebrating marks", "report card", "parent meeting",
    "festival lights", "diyas lighting", "crackers bursting", "rangoli design", "visiting temple", "wearing traditional", "eating sweets", "greeting friends", "celebrating festival", "cleaning house",
    "eid prayer", "moon sighting", "mosque visit", "charity giving", "festive food", "christmas tree", "santa claus", "gift exchange", "snow decoration", "new year party",
    "wedding ceremony", "bride dress", "groom suit", "ring exchange", "marriage stage", "dance wedding", "family gathering", "photo shoot", "celebration dinner", "honeymoon trip",
    "baby crying", "feeding baby", "diaper change", "baby crawling", "first step", "toy playing", "sleeping baby", "mother care", "father holding",
    "old person walking", "stick support", "glasses wearing", "reading newspaper", "talking elders", "family time", "storytelling", "wisdom sharing", "grandparent love", "resting chair",
    "opening umbrella", "broken umbrella", "sharing umbrella", "slipping on wet floor", "jumping in puddle", "running in rain", "drying clothes outside", "wind blowing clothes", "chasing hat", "flying kite",
    "bus stop waiting", "missing bus", "boarding train", "traffic signal waiting", "overtaking car", "reversing vehicle", "parking struggle", "honking traffic", "crossing bridge",
    "lost in forest", "following map", "climbing hill", "crossing river", "setting campfire", "roasting marshmallow", "night camping", "hearing animal sound", "flashlight searching", "finding path",
    "watering garden", "planting seeds", "digging soil", "cutting branches", "collecting leaves", "making compost", "growing plant", "picking flowers", "smelling flower", "decorating garden",
    "building sandcastle", "writing on sand", "collecting shells", "throwing stone in water", "skipping stones", "chasing waves", "walking barefoot", "beach picnic", "sunburn face",
    "shopping with cart", "forgetting wallet", "comparing prices", "carrying heavy bags", "dropping items", "scanning barcode", "paying bill", "waiting in queue", "checking receipt", "returning product",
    "video calling friend", "sending emoji", "typing fast", "deleting message", "taking screenshot", "editing photo", "posting online", "checking likes", "scrolling feed", "blocking user",
    "online class listening", "teacher explaining", "student sleeping", "raising hand", "answering question", "taking notes", "submitting homework", "sharing screen", "internet lag", "reconnecting call",
    "cooking noodles", "burning toast", "cutting finger lightly", "washing vegetables", "mixing ingredients", "tasting food", "serving dish", "spilling tea", "cleaning stove", "storing leftovers",
    "restaurant ordering", "waiter taking order", "waiting for food", "wrong order", "sharing meal", "tipping waiter", "asking bill", "reserving table", "crowded restaurant", "empty restaurant",
    "cleaning mirror", "organizing desk", "arranging books", "folding blanket", "washing dishes", "drying plates", "vacuum cleaning", "dusting shelves", "fixing bed", "opening window",
    "playing cricket shot", "missing catch", "diving save", "running between wickets", "hitting six", "bowling fast", "umpire decision", "cheering crowd", "winning match", "losing match",
    "cycling uphill", "riding downhill", "falling from cycle", "fixing chain", "pumping air", "ringing bell", "overtaking cyclist", "wearing helmet", "racing friends", "night cycling",
    "swimming freestyle", "floating on water", "jumping in pool", "holding breath", "racing swim", "diving board", "underwater bubbles", "splashing water", "pool cleaning", "lifeguard watching",
    "lifting weights", "treadmill running", "stretching arms", "yoga breathing", "meditation sitting", "pushup challenge", "skipping rope fast", "sweating workout", "gym trainer", "muscle flex",
    "chasing thief", "hiding from police", "running fast", "jumping fence", "escaping danger", "searching clues", "solving mystery", "finding evidence", "interrogating suspect",
    "fire spreading", "using extinguisher", "rescuing pet", "breaking window", "calling help", "emergency siren", "carrying injured", "stopping fire",
    "fixing light bulb", "repairing switch", "connecting wires", "checking voltage", "using screwdriver", "hammering nail", "measuring length", "cutting wood", "drilling hole",
    "painting house", "dropping paint", "cleaning brush", "drawing pattern", "coloring art", "designing poster", "decorating room", "hanging picture",
    "playing guitar chords", "tuning strings", "singing loudly", "clapping rhythm", "dancing freestyle", "copying steps", "group dance", "stage performance", "music practice",
    "watching movie", "laughing scene", "crying scene", "horror scene", "popcorn spilling", "buying ticket", "entering hall", "finding seat", "projector light", "movie ending",
    "drone flying high", "controlling remote", "taking aerial shot", "landing drone", "losing signal", "crashing drone", "fixing drone", "charging battery", "recording video", "following target",
    "rocket launching", "countdown timer", "ignition start", "smoke blast", "reaching space", "orbiting earth", "landing safely", "astronaut floating", "space walking", "satellite orbit",
    "performing magic", "hiding object", "revealing trick", "guessing card", "audience surprised", "magic fail", "practicing trick", "learning illusion", "stage magic", "magic show",
    "castle gate", "guard standing", "king speaking", "queen smiling", "knight riding", "battle planning", "defending castle", "raising flag", "winning war",
    "searching treasure", "digging ground", "finding chest", "opening lock", "gold shining", "pirate laughing", "reading map", "marking X", "escaping island", "sailing ship",
    "ghost appearing", "hiding shadow", "closing door slowly", "hearing noise", "running away", "scary face", "haunted room", "flickering light", "dark hallway",
    "superhero landing", "flying fast", "saving child", "stopping villain", "using power", "throwing punch", "blocking attack", "wearing mask", "hiding identity", "rescuing city",
    "shopping groceries", "picking vegetables", "weighing fruits", "checking quality", "bargaining vendor", "paying cash", "carrying basket", "selecting items", "packing goods", "leaving store",
    "office typing fast", "attending meeting", "drinking coffee", "answering call", "printing file", "discussing project", "checking deadline", "working late", "finishing task",
    "bank deposit money", "withdrawing cash", "counting notes", "signing form", "verifying identity", "opening account", "taking loan", "approving request", "checking balance", "closing account",
    "kids playing tag", "chasing friend", "hiding behind wall", "jumping rope", "climbing slide", "swinging high", "laughing loudly", "falling down", "getting up", "running again",
    "feeding pet dog", "playing fetch", "giving treat", "brushing fur", "taking walk", "barking loudly", "sleeping peacefully", "chasing cat", "digging ground", "wagging tail",
    "traffic controlling", "stopping vehicles", "blowing whistle", "checking license", "issuing fine", "helping pedestrian", "clearing road", "directing traffic", "standing in heat", "managing crowd",
    "studying at night", "reading textbook", "solving problems", "writing notes", "feeling sleepy", "drinking coffee", "revising chapters", "preparing exam", "checking answers", "finishing paper",
    "lighting diyas", "decorating home", "bursting crackers", "drawing rangoli", "eating sweets", "greeting friends", "celebrating festival", "cleaning house",
    "decorating tree", "hanging lights", "wrapping gifts", "singing carols", "meeting family", "sharing cake", "wearing sweater", "taking photos", "exchanging presents", "enjoying holiday",
    "wedding dancing", "throwing flowers", "clicking photos", "cutting cake", "greeting guests", "wearing suit", "wearing saree", "family gathering", "blessing couple", "celebrating marriage",
    "baby crawling fast", "laughing loudly", "crying suddenly", "feeding milk", "sleeping peacefully", "waking up", "learning walk", "holding finger", "smiling face",
    "elder walking slowly", "using stick", "reading newspaper", "talking elders", "family time", "storytelling", "wisdom sharing", "grandparent love", "resting chair",
    "time travel", "broken clock", "invisible man", "flying car", "talking tree", "laughing gas", "crying baby", "sleeping giant", "running shadow", "glowing eyes",
    "lost signal", "dead battery", "weak network", "fast internet", "buffering video", "viral post", "trending topic", "fake news", "spam message", "error screen",
    "double rainbow", "upside down house", "floating island", "burning ice", "melting clock", "giant mushroom", "tiny elephant", "long shadow", "hidden door", "secret tunnel",
    "night owl", "early bird", "lazy cat", "busy bee", "silent room", "loud noise", "dark alley", "bright light", "empty street", "crowded market",
    "mirror reflection", "shadow fight", "echo sound", "whisper secret", "loud scream", "deep silence", "sudden shock", "quick reaction", "slow motion", "fast forward",
    "missed call", "wrong number", "hidden message", "secret code", "password lock", "fingerprint scan", "face unlock", "eye scanner", "digital lock", "security alert",
    "online friend", "offline mode", "game over", "level up", "high score", "low battery", "system crash", "reboot system", "loading screen", "save game",
    "magic carpet", "flying broom", "invisible cloak", "spell book", "potion mix", "fire magic", "ice magic", "thunder magic", "teleport portal", "time freeze",
    "dragon breath", "phoenix fire", "unicorn horn", "fairy dust", "wizard tower", "enchanted forest", "cursed object", "magical door", "glowing crystal", "dark magic",
    "haunted mirror", "ghost whisper", "zombie attack", "vampire bite", "skeleton dance", "horror night", "creepy doll", "scary shadow", "nightmare dream", "evil laugh",
    "super speed", "super strength", "mind control", "laser eyes", "shield power", "teleport jump", "energy blast", "invisibility", "time stop", "gravity shift",
    "villain hideout", "secret base", "spy mission", "stealth mode", "hacking system", "data leak", "cyber attack", "firewall breach", "system hack", "code crack",
    "robot uprising", "ai brain", "machine learning", "data processing", "signal decoding", "voice recognition", "image detection", "neural network", "algorithm flow", "data stream",
    "smart home", "voice command", "automatic door", "sensor light", "security camera", "motion detector", "alarm system", "smart lock", "remote control", "automation",
    "space mission", "rocket failure", "alien invasion", "planet collision", "black hole", "solar storm", "meteor shower", "galaxy spin", "star explosion", "orbit shift",
    "deep ocean", "lost submarine", "underwater cave", "giant squid", "sea monster", "coral reef", "ocean storm", "sinking ship", "treasure dive", "shark attack",
    "desert storm", "mirage illusion", "lost traveler", "sand tornado", "dry land", "cactus field", "hot sun", "survival mode", "water shortage", "oasis finding",
    "mountain rescue", "falling rock", "snow avalanche", "ice crack", "lost climber", "rope break", "cliff edge", "cold wind", "frozen lake", "deep valley",
    "jungle danger", "wild chase", "hidden animal", "snake bite", "river crossing", "dense forest", "survival camp", "night fire", "animal sound", "lost path",
    "city blackout", "power failure", "traffic chaos", "car crash", "broken bridge", "emergency call", "rescue mission", "fire breakout", "flood water", "earthquake shake",
    "airport delay", "missed flight", "lost luggage", "security check", "boarding rush", "passport lost", "gate change", "flight cancel", "travel stress", "long queue",
    "office stress", "deadline panic", "boss call", "team meeting", "late submission", "project fail", "sudden success", "promotion news", "job interview", "resume check",
    "school pressure", "exam fear", "last minute study", "cheating attempt", "result shock", "top rank", "fail again", "surprise test", "group project", "teacher anger",
    "family dinner", "argument fight", "happy moment", "surprise visit", "emotional talk", "childhood memory", "festival joy", "celebration mood", "bonding time", "goodbye scene",
    "wedding drama", "proposal moment", "love letter", "broken heart", "friendship bond", "reunion meet", "emotional hug", "first meeting", "last goodbye", "long distance",
    "funny fall", "slipping banana", "water splash", "prank call", "laughing hard", "joke fail", "awkward moment", "silly face", "funny dance", "meme reaction",
    "lazy morning", "alarm snooze", "late wakeup", "rushing fast", "missing bus", "quick breakfast", "coffee spill", "work rush", "tired night", "deep sleep",
    "gym struggle", "weight drop", "muscle gain", "fitness goal", "running fast", "breathing hard", "sweat drop", "tired body", "strong push", "final rep",
    "sports win", "last goal", "penalty miss", "team spirit", "coach shout", "crowd cheer", "final match", "comeback win", "defeat moment", "trophy lift",
    "music vibe", "loud bass", "dance beat", "singing offkey", "live concert", "crowd wave", "stage jump", "mic drop", "band sync", "rhythm flow",
    "movie twist", "surprise ending", "plot twist", "hero entry", "villain laugh", "emotional scene", "action fight", "car chase", "slow reveal", "final battle",
    "art creation", "messy paint", "color mix", "abstract art", "sketch fail", "masterpiece", "drawing idea", "blank canvas", "creative block", "inspiration hit",
    "rain romance", "umbrella share", "wet clothes", "cold breeze", "thunder fear", "cozy room", "hot tea", "window watching", "dreamy mood", "calm vibe",
    "sunset view", "golden sky", "beach walk", "calm waves", "deep thoughts", "silent moment", "peaceful mind", "relaxing time", "fresh air", "nature love",
    "night drive", "city lights", "empty road", "cool breeze", "music playing", "long ride", "fuel low", "wrong turn", "lost route", "finding way",
    "online gaming", "rage quit", "team fight", "victory shout", "defeat anger", "reconnecting", "lag spike", "smooth play", "clutch moment", "final win",
    "phone addiction", "low signal", "charging panic", "screen crack", "app crash", "update pending", "storage full", "delete files", "backup data", "restore system",
    "shopping rush", "big discount", "last piece", "sold out", "heavy bags", "wrong size", "exchange item", "refund wait", "long billing", "payment fail",
    "restaurant wait", "cold food", "wrong dish", "extra spicy", "sweet overload", "sharing plate", "fast eating", "late order", "chef mistake", "tip skip",
    "travel vlog", "camera setup", "scenic shot", "drone view", "selfie stick", "video edit", "upload fail", "low views", "viral clip", "trending video",
    "train delay", "crowded coach", "window seat", "ticket lost", "platform rush", "luggage heavy", "food vendor", "chai cup", "night journey", "station stop",
    "bus ride", "standing crowd", "sudden brake", "seat fight", "loud music", "conductor call", "ticket check", "route change", "final stop", "long ride",
    "weather change", "sudden rain", "bright sun", "cold wind", "hot wave", "cloudy sky", "storm coming", "thunder loud", "lightning flash", "rainbow appear",
    "festival rush", "crowded street", "sweet overload", "loud music", "colorful lights", "traditional dress", "family visit", "gift exchange", "celebration mood", "firecracker sound",
    "daily routine", "morning rush", "work stress", "evening relax", "night sleep", "repeat life", "habit loop", "time pass", "busy schedule", "free time",
    "astronaut", "black hole", "galaxy", "telescope", "meteor", "alien spaceship", "laser gun", "robot dog", "time machine", "cyborg",
    "pyramid", "mummy", "pharaoh", "sphinx", "colosseum", "roman gladiator", "viking ship", "knight armor", "medieval castle", "jousting",
    "pterodactyl", "t-rex", "triceratops", "velociraptor", "fossil", "volcanic eruption", "ice age", "caveman", "mammoth", "saber tooth tiger",
    "saxophone", "cello", "harp", "xylophone", "tambourine", "maracas", "accordion", "bagpipes", "banjo", "ukulele",
    "screwdriver", "chainsaw", "lawnmower", "wheelbarrow", "pitchfork", "anvil", "blowtorch", "hammer and nail", "measuring tape", "pliers",
    "baking soda", "whisk", "spatula", "rolling pin", "cutting board", "colander", "peeler", "grater", "oven mitt", "measuring cup",
    "bookshelf", "wardrobe", "coffee table", "bunk bed", "recliner", "bean bag", "rocking chair", "chandelier", "dresser", "nightstand",
    "origami", "knitting", "pottery", "sculpture", "calligraphy", "woodworking", "gardening", "bird watching", "stamps", "coin collection",
    "ninja star", "samurai sword", "nunchucks", "crossbow", "boomerang", "slingshot", "bazooka", "grenade", "tank", "fighter jet",
    "basketball court", "tennis court", "boxing ring", "golf course", "bowling alley", "swimming pool", "ice rink", "skate park", "race track", "football stadium",
    "checkmate", "tic tac toe", "jigsaw puzzle", "rubiks cube", "dominoes", "dartboard", "billiards", "pinball", "slot machine", "arcade game",
    "pancake syrup", "waffle iron", "french toast", "bacon strips", "scrambled eggs", "cereal bowl", "oatmeal", "croissant", "bagel cream cheese", "muffin tin",
    "spaghetti meatballs", "lasagna", "macaroni cheese", "sushi roll", "taco shell", "burrito", "nachos cheese", "enchilada", "fajita", "quesadilla",
    "ice cream sundae", "apple pie", "chocolate chip cookie", "brownie", "cheesecake", "cotton candy", "lollipop", "marshmallow", "gummy bear", "jelly bean",
    "ketchup bottle", "mustard bottle", "mayonnaise jar", "relish", "soy sauce", "hot sauce", "salt shaker", "pepper grinder", "olive oil", "vinegar",
    "washing machine", "dryer", "dishwasher", "refrigerator", "microwave oven", "toaster oven", "blender", "food processor", "coffee maker", "espresso machine",
    "vacuum cleaner", "ironing board", "mop bucket", "feather duster", "broomstick", "trash can", "recycling bin", "laundry basket", "clothesline", "clothespin",
    "shampoo bottle", "conditioner", "body wash", "bar soap", "loofah", "shower cap", "bathrobe", "towel rack", "bath mat", "toilet brush",
    "toothbrush", "toothpaste tube", "dental floss", "mouthwash", "razor blade", "shaving cream", "hair gel", "hair spray", "bobby pin", "hair scrunchie",
    "lipstick", "mascara", "eyeliner", "eyeshadow", "blush", "foundation", "perfume bottle", "nail polish", "makeup brush", "compact mirror",
    "necklace", "earrings", "bracelet", "ring", "watch", "cufflinks", "tie clip", "brooch", "pendant", "charm bracelet",
    "sunglasses", "reading glasses", "contact lens", "goggles", "monocle", "binoculars", "microscope", "magnifying glass", "telescope lens", "camera lens",
    "backpack", "purse", "wallet", "briefcase", "suitcase", "duffel bag", "fanny pack", "tote bag", "messenger bag", "clutch",
    "baseball cap", "cowboy hat", "top hat", "fedora", "beanie", "sun hat", "sombrero", "beret", "bowler hat", "wizard hat",
    "scarf", "gloves", "mittens", "earmuffs", "winter coat", "snow boots", "ice skates", "snowboard", "ski poles", "toboggan",
    "swimsuit", "bikini", "swim trunks", "flip flops", "sandals", "high heels", "sneakers", "boots", "loafers", "slippers",
    "t-shirt", "button down shirt", "polo shirt", "tank top", "sweater vest", "hoodie", "leather jacket", "denim jacket", "blazer", "trench coat",
    "jeans", "khakis", "sweatpants", "shorts", "skirt", "dress", "suit", "tuxedo", "wedding dress", "bow tie",
    "necktie", "belt buckle", "suspenders", "socks", "stockings", "tights", "leggings", "pajamas", "nightgown", "robe",
    "laptop computer", "desktop computer", "computer monitor", "computer mouse", "mouse pad", "usb flash drive", "external hard drive", "router", "modem", "ethernet cable",
    "charging cable", "power adapter", "surge protector", "extension cord", "wall outlet", "light bulb", "fluorescent tube", "led strip", "flashlight", "lantern",
    "smartwatch", "fitness tracker", "wireless earbuds", "headphones", "bluetooth speaker", "microphone", "webcam", "printer", "scanner", "projector",
    "television set", "remote control", "dvd player", "blu-ray player", "game console", "video game controller", "vr headset", "arcade cabinet", "pinball machine", "jukebox",
    "bookcase", "magazine rack", "file cabinet", "desk organizer", "pencil holder", "stapler", "tape dispenser", "hole punch", "paper clip", "push pin",
    "post-it note", "notepad", "spiral notebook", "binder", "clipboard", "dry erase board", "cork board", "calendar", "calculator", "ruler",
    "fountain pen", "ballpoint pen", "highlighter", "sharpie", "colored pencils", "crayons", "watercolors", "paint palette", "easel", "canvas",
    "clay", "play-doh", "glue stick", "bottle of glue", "scissors", "craft knife", "origami paper", "pipe cleaners", "googly eyes", "glitter",
    "yarn", "knitting needles", "crochet hook", "sewing machine", "needle and thread", "thimble", "pin cushion", "measuring tape", "fabric shears", "buttons",
    "zipper", "velcro", "safety pin", "bobby pin", "rubber band", "paper clip", "toothpick", "cotton swab", "cotton ball", "tissue paper",
    "toilet paper roll", "paper towel roll", "napkin", "paper plate", "plastic cup", "straw", "plastic fork", "plastic spoon", "plastic knife", "chopsticks",
    "pizza cutter", "can opener", "bottle opener", "corkscrew", "nutcracker", "garlic press", "lemon squeezer", "ice cream scoop", "melon baller", "meat tenderizer",
    "potato masher", "slotted spoon", "ladle", "tongs", "spatula", "whisk", "wooden spoon", "rolling pin", "pastry brush", "basting brush",
    "measuring cups", "measuring spoons", "mixing bowl", "colander", "strainer", "sifter", "grater", "zester", "peeler", "mandoline",
    "cutting board", "knife block", "chef's knife", "bread knife", "paring knife", "cleaver", "kitchen shears", "sharpening steel", "cutting board", "carving fork",
    "frying pan", "saucepan", "stockpot", "dutch oven", "roasting pan", "baking sheet", "muffin tin", "cake pan", "pie dish", "casserole dish",
    "mixing bowl", "salad spinner", "tupperware", "food storage container", "mason jar", "thermos", "water bottle", "travel mug", "coffee mug", "teacup",
    "teapot", "french press", "coffee grinder", "blender", "food processor", "stand mixer", "hand mixer", "toaster", "waffle iron", "slow cooker",
    "pressure cooker", "rice cooker", "deep fryer", "air fryer", "microwave", "oven", "stovetop", "range hood", "dishwasher", "refrigerator",
    "freezer", "ice maker", "water dispenser", "trash compactor", "garbage disposal", "kitchen sink", "faucet", "sponge", "dish soap", "dish towel",
    "bed frame", "mattress", "box spring", "pillow", "pillowcase", "bed sheets", "blanket", "comforter", "duvet", "quilt",
    "nightstand", "dresser", "chest of drawers", "wardrobe", "closet", "hanger", "shoe rack", "laundry hamper", "iron", "ironing board",
    "bathroom sink", "bathtub", "shower", "shower head", "shower curtain", "toilet", "bidet", "toilet paper", "plunger", "toilet brush",
    "bath towel", "hand towel", "washcloth", "bath mat", "scale", "mirror", "medicine cabinet", "toothbrush holder", "soap dispenser", "soap dish",
    "living room", "sofa", "couch", "loveseat", "armchair", "recliner", "ottoman", "coffee table", "end table", "tv stand",
    "entertainment center", "bookshelf", "fireplace", "mantel", "rug", "carpet", "curtains", "blinds", "lampshade", "floor lamp",
    "table lamp", "ceiling fan", "chandelier", "picture frame", "painting", "poster", "wall clock", "vase", "houseplant", "throw pillow",
    "dining room", "dining table", "dining chair", "high chair", "booster seat", "placemat", "tablecloth", "napkin", "napkin ring", "centerpiece",
    "front door", "doorknob", "doorbell", "welcome mat", "mailbox", "porch", "patio", "deck", "balcony", "garage",
    "driveway", "sidewalk", "street", "road", "highway", "freeway", "intersection", "traffic light", "stop sign", "street sign",
    "fire hydrant", "streetlight", "telephone pole", "power line", "bus stop", "subway station", "train station", "airport", "airplane", "helicopter",
    "hot air balloon", "blimp", "parachute", "hang glider", "kite", "drone", "rocket", "spaceship", "satellite", "space station",
    "astronaut", "alien", "ufo", "planet", "star", "sun", "moon", "asteroid", "comet", "meteor",
    "galaxy", "universe", "black hole", "telescope", "microscope", "magnifying glass", "binoculars", "camera", "tripod", "flash",
    "photograph", "picture", "album", "frame", "canvas", "easel", "palette", "paintbrush", "paint", "drawing",
    "sketch", "doodle", "cartoon", "comic book", "graphic novel", "magazine", "newspaper", "book", "novel", "dictionary",
    "encyclopedia", "atlas", "map", "globe", "compass", "gps", "navigation", "directions", "sign", "billboard",
    "advertisement", "commercial", "television", "radio", "podcast", "music", "song", "singer", "band", "concert",
    "album", "record", "cd", "cassette tape", "mp3 player", "headphones", "earbuds", "speaker", "amplifier", "microphone",
    "guitar", "bass guitar", "acoustic guitar", "electric guitar", "drum set", "cymbals", "snare drum", "bass drum", "piano", "keyboard",
    "synthesizer", "violin", "cello", "double bass", "flute", "clarinet", "saxophone", "trumpet", "trombone", "tuba",
    "french horn", "harmonica", "accordion", "bagpipes", "banjo", "ukulele", "mandolin", "harp", "xylophone", "marimba",
    "orchestra", "conductor", "baton", "sheet music", "music stand", "metronome", "tuning fork", "notes", "chords", "melody",
    "rhythm", "beat", "tempo", "harmony", "lyrics", "chorus", "verse", "bridge", "solo", "duet",
    "choir", "opera", "musical", "theater", "stage", "curtain", "spotlight", "props", "costume", "makeup",
    "mask", "wig", "actor", "actress", "director", "producer", "script", "screenplay", "movie", "film",
    "cinema", "theater", "ticket", "popcorn", "soda", "candy", "snack", "concession stand", "usher", "audience",
    "applause", "standing ovation", "encore", "review", "critic", "award", "trophy", "medal", "ribbon", "certificate",
    "diploma", "degree", "graduation", "cap and gown", "tassel", "school", "classroom", "teacher", "student", "desk",
    "chair", "blackboard", "whiteboard", "chalk", "marker", "eraser", "pencil", "pen", "crayon", "colored pencil",
    "highlighter", "ruler", "protractor", "compass", "calculator", "notebook", "binder", "folder", "paper", "textbook",
    "backpack", "lunchbox", "locker", "hallway", "cafeteria", "gymnasium", "library", "recess", "playground", "swing set",
    "slide", "seesaw", "monkey bars", "sandbox", "hopscotch", "jump rope", "tag", "hide and seek", "basketball", "football",
    "soccer", "baseball", "softball", "volleyball", "tennis", "golf", "bowling", "swimming", "diving", "gymnastics",
    "track and field", "running", "jumping", "throwing", "wrestling", "boxing", "martial arts", "karate", "judo", "taekwondo",
    "fencing", "archery", "shooting", "equestrian", "horseback riding", "cycling", "skateboarding", "snowboarding", "skiing", "ice skating",
    "figure skating", "hockey", "curling", "bobsled", "luge", "skeleton", "surfing", "bodyboarding", "windsurfing", "kitesurfing",
    "water skiing", "wakeboarding", "scuba diving", "snorkeling", "fishing", "hunting", "camping", "hiking", "backpacking", "rock climbing",
    "mountaineering", "mountain biking", "kayaking", "canoeing", "rafting", "sailing", "boating", "water polo", "synchronized swimming", "triathlon",
    "marathon", "sprint", "relay race", "hurdles", "long jump", "high jump", "pole vault", "shot put", "discus", "javelin",
    "decathlon", "heptathlon", "olympics", "world cup", "championship", "tournament", "match", "game", "inning", "quarter",
    "half", "period", "overtime", "sudden death", "score", "goal", "point", "run", "touchdown", "home run",
    "foul", "penalty", "referee", "umpire", "coach", "manager", "player", "athlete", "team", "captain",
    "lineup", "roster", "substitute", "bench", "locker room", "stadium", "arena", "field", "court", "pitch",
    "track", "pool", "rink", "course", "fan", "supporter", "spectator", "crowd", "cheerleader", "mascot",
    "alligator", "alpaca", "anteater", "antelope", "armadillo", "baboon", "badger", "bald eagle", "bandicoot", "barn owl",
    "bat", "bear", "beaver", "bison", "black bear", "black panther", "blue whale", "bobcat", "brown bear", "buffalo",
    "bull", "camel", "canary", "capybara", "cassowary", "caterpillar", "catfish", "chameleon", "cheetah", "chimpanzee",
    "chinchilla", "chipmunk", "cobra", "cockatoo", "condor", "coral", "coyote", "crane", "crocodile", "crow",
    "dalmatian", "deer", "dingo", "dolphin", "donkey", "dove", "dragonfly", "duck", "eagle", "earthworm",
    "echidna", "eel", "elephant", "elk", "emu", "falcon", "ferret", "finch", "flamingo", "flea",
    "flounder", "fox", "frog", "gazelle", "gecko", "gerbil", "giant panda", "giraffe", "goat", "goose",
    "gorilla", "grasshopper", "grizzly bear", "guinea pig", "hamster", "hare", "hawk", "hedgehog", "heron", "hippopotamus",
    "horse", "hummingbird", "hyena", "iguana", "impala", "jackal", "jaguar", "jellyfish", "kangaroo", "kingfisher",
    "koala", "komodo dragon", "ladybug", "lemur", "leopard", "lion", "llama", "lobster", "lynx", "macaw",
    "magpie", "manatee", "mandrill", "manta ray", "marlin", "meerkat", "mink", "mole", "mongoose", "monitor lizard",
    "monkey", "moose", "mosquito", "moth", "mountain goat", "mouse", "mule", "narwhal", "newt", "nightingale",
    "octopus", "ostrich", "otter", "owl", "ox", "oyster", "panther", "parrot", "partridge", "peacock",
    "pelican", "penguin", "pheasant", "pig", "pigeon", "polar bear", "porcupine", "porpoise", "possum", "prairie dog",
    "praying mantis", "puffin", "puma", "python", "quail", "quokka", "rabbit", "raccoon", "rat", "rattlesnake",
    "raven", "reindeer", "rhinoceros", "robin", "salamander", "salmon", "sandpiper", "scorpion", "seagull", "seahorse",
    "seal", "shark", "sheep", "skunk", "sloth", "snail", "snake", "snow leopard", "sparrow", "spider",
    "sponge", "squid", "squirrel", "starfish", "stingray", "stork", "swallow", "swan", "tapir", "tarantula",
    "termite", "tiger", "toad", "tortoise", "toucan", "trout", "turkey", "turtle", "viper", "vulture",
    "walrus", "wasp", "weasel", "whale", "wolf", "wombat", "woodpecker", "worm", "yak", "zebra",
    "acoustics", "actor", "adjective", "adult", "aeroplane", "air", "aircraft", "airforce", "airport", "album",
    "alphabet", "amount", "amusement", "anatomy", "anger", "animal", "annual", "answer", "ant", "apparel",
    "apple", "appliance", "approval", "architecture", "argument", "arithmetic", "arm", "armada", "army", "art",
    "ash", "ashtray", "association", "astronaut", "astronomy", "athlete", "atmosphere", "atom", "attack", "attempt",
    "attention", "attic", "attitude", "attraction", "audience", "aunt", "author", "authority", "automobile", "avenue",
    "baboon", "baby", "back", "background", "bacon", "badge", "bag", "bagpipe", "bail", "bait",
    "baker", "bakery", "balance", "balcony", "ball", "balloon", "bamboo", "band", "bandage", "bandana",
    "bank", "banker", "bar", "barbarian", "barbecue", "barber", "bargain", "bark", "barrel", "barrier",
    "base", "baseball", "basement", "basin", "basis", "basket", "basketball", "bat", "batch", "bath",
    "battalion", "battery", "battle", "battleship", "bay", "beach", "bead", "beak", "beam", "bean",
    "bear", "beard", "beast", "beat", "beauty", "beaver", "bed", "bedroom", "bee", "beef",
    "beetle", "beggar", "beginner", "behavior", "belief", "bell", "belly", "belt", "bench", "berry",
    "bicycle", "bike", "bill", "billion", "bin", "biology", "bird", "birth", "birthday", "biscuit",
    "bite", "blade", "blanket", "block", "blood", "bloom", "blossom", "blow", "board", "boat",
    "body", "bone", "book", "boot", "border", "boss", "bottle", "bottom", "boundary", "bow",
    "bowl", "boy", "boyfriend", "brain", "branch", "brass", "bread", "breakfast", "breath", "brick",
    "bridge", "briefcase", "brother", "brush", "bubble", "bucket", "building", "bulb", "bull", "bunch",
    "bus", "bush", "business", "butter", "butterfly", "button", "cabbage", "cabin", "cabinet", "cable",
    "cactus", "cafe", "cake", "calculator", "calendar", "calf", "call", "camel", "camera", "camp",
    "campaign", "can", "canal", "candy", "cane", "cannon", "canvas", "cap", "capital", "captain",
    "car", "card", "cardboard", "care", "career", "carpenter", "carpet", "carrot", "cart", "cartoon",
    "case", "cash", "cast", "castle", "cat", "catalog", "catch", "category", "cause", "cave",
    "cd", "ceiling", "cell", "cellar", "cello", "cement", "cemetery", "cent", "center", "century",
    "ceremony", "chain", "chair", "chalk", "champion", "chance", "change", "channel", "chapter", "character",
    "charge", "charity", "chart", "chase", "check", "cheek", "cheese", "chef", "chemical", "chemistry",
    "chest", "chicken", "chief", "child", "childhood", "chimney", "chimpanzee", "chin", "chocolate", "choice",
    "choir", "church", "cigarette", "circle", "city", "claim", "class", "classroom", "clay", "cleaner",
    "clerk", "click", "client", "cliff", "climate", "climb", "clinic", "clock", "closet", "cloth",
    "cloud", "club", "clue", "coach", "coal", "coast", "coat", "cockroach", "code", "coffee",
    "coil", "coin", "cold", "collar", "collection", "college", "color", "column", "comb", "combination",
    "combine", "comedy", "comfort", "comic", "committee", "company", "comparison", "competition", "complaint", "complex",
    "computer", "concept", "concert", "conclusion", "condition", "conference", "confidence", "connection", "conscious", "consequence",
    "contact", "container", "continent", "contract", "conversation", "cook", "cookie", "copy", "cord", "corn",
    "corner", "corporation", "cost", "cotton", "couch", "cough", "country", "course", "court", "cousin",
    "cover", "cow", "cowboy", "crab", "crack", "craft", "crash", "crate", "crayon", "cream",
    "creator", "creature", "credit", "creek", "crew", "cricket", "crime", "criminal", "crocodile", "crop",
    "cross", "crowd", "crown", "cruiser", "crust", "cry", "cub", "cube", "cucumber", "culture",
    "cup", "cupboard", "curtain", "curve", "cushion", "custom", "customer", "cut", "cycle", "dad",
    "damage", "dance", "danger", "dark", "data", "database", "date", "daughter", "day", "dead",
    "deal", "death", "debate", "debt", "decade", "decimal", "decision", "deck", "decrease", "deer",
    "defense", "degree", "delay", "demand", "dentist", "department", "deposit", "depth", "desert", "design",
    "desk", "detail", "detective", "development", "device", "devil", "diamond", "diary", "dictionary", "diet",
    "difference", "difficulty", "dig", "dinner", "dinosaur", "diploma", "direction", "director", "dirt", "disaster",
    "discipline", "discount", "disease", "dish", "disk", "display", "distance", "distribution", "district", "divide",
    "doctor", "document", "dog", "doll", "dollar", "dolphin", "domain", "door", "dot", "double",
    "doubt", "dove", "dragon", "drain", "drama", "draw", "drawer", "drawing", "dream", "dress",
    "drink", "drive", "driver", "drop", "duck", "dust", "duty", "dwarf", "eagle", "ear",
    "earth", "earthquake", "ease", "east", "economy", "edge", "editor", "education", "effect", "efficiency",
    "egg", "egypt", "elastic", "elbow", "elder", "election", "electricity", "elephant", "elevator", "emotion",
    "employee", "employer", "employment", "end", "enemy", "energy", "engine", "engineer", "entertainment", "entrance",
    "envelope", "environment", "equipment", "error", "escape", "essay", "estate", "evening", "event", "evidence",
    "exam", "example", "exchange", "exercise", "exhaust", "exhibition", "existence", "expansion", "experience", "expert",
    "explanation", "expression", "extension", "eye", "eyebrow", "face", "fact", "factory", "fail", "failure",
    "fair", "fairy", "faith", "fall", "family", "fan", "fang", "farm", "farmer", "fashion",
    "fat", "father", "fault", "fear", "feast", "feather", "feature", "fee", "feeling", "female",
    "fence", "ferry", "festival", "fever", "fiber", "fiction", "field", "fight", "figure", "file",
    "fill", "film", "filter", "finance", "finding", "finger", "fire", "fireman", "fireplace", "firm",
    "fish", "fishing", "flag", "flame", "flash", "flat", "flavor", "flesh", "flight", "flock",
    "flood", "floor", "flower", "fluid", "fly", "focus", "fog", "fold", "food", "fool",
    "foot", "football", "force", "forest", "fork", "form", "fort", "fortune", "foundation", "fountain",
    "fox", "frame", "freedom", "freezer", "freight", "french", "friction", "friend", "frog", "front",
    "frost", "fruit", "fuel", "fun", "function", "fund", "funeral", "fur", "furniture", "future",
    "galaxy", "gallery", "game", "gap", "garage", "garbage", "garden", "garlic", "gas", "gate",
    "gear", "gene", "general", "generation", "ghost", "giant", "gift", "girl", "girlfriend", "glass",
    "globe", "glove", "glue", "goal", "goat", "god", "gold", "golf", "good", "government",
    "governor", "grade", "grain", "gram", "granddaughter", "grandfather", "grandmother", "grandson", "grape", "graph",
    "grass", "gravity", "gray", "great", "greek", "green", "group", "growth", "guard", "guess",
    "guest", "guide", "guitar", "gun", "gym", "gymnast", "habit", "hair", "haircut", "half",
    "hall", "hamburger", "hammer", "hand", "handle", "hardware", "harm", "harmony", "hat", "hate",
    "haze", "head", "health", "hearing", "heart", "heat", "heaven", "height", "helicopter", "hell",
    "helmet", "help", "hen", "hero", "highway", "hill", "hint", "hip", "history", "hit",
    "hockey", "hole", "holiday", "home", "honey", "hood", "hook", "hope", "horn", "horse",
    "eye hospital", "host", "hotel", "hour", "house", "hovercraft", "hub", "hug", "human", "humor",
    "hunger", "hunt", "hunter", "hurricane", "hurry", "husband", "hut", "ice", "idea", "ideal"
]));

// Helper to pick 3 random words for the drawer to choose from, avoiding repeats
function generateWords(room) {
    let availableWords = wordList.filter(w => !room.usedWords.includes(w));
    
    // Automatically reset if we exhaust the dictionary
    if (availableWords.length < 3) {
        room.usedWords = [];
        availableWords = wordList;
    }

    // Perfect randomization using Fisher-Yates shuffle
    for (let i = availableWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableWords[i], availableWords[j]] = [availableWords[j], availableWords[i]];
    }
    
    return availableWords.slice(0, 3);
}

// Logic to advance the game to the next player's turn
function nextTurn(roomId) {
    const room = rooms[roomId];
    if (!room || room.players.length === 0) return;

    // Reset round state
    room.timer = 80;
    room.word = ""; // Word is blank until drawer chooses
    room.guessedCorrectly = [];
    room.roundPoints = {}; // Track who earned what this specific round
    
    // Select the next player as the drawer (rotate through list)
    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
    room.currentDrawer = room.players[room.currentPlayerIndex].id;

    // Send the 3 options to the drawer
    const options = generateWords(room);
    const drawerName = room.players[room.currentPlayerIndex].name;

    io.to(roomId).emit("turnStart", {
        drawerId: room.currentDrawer,
        drawerName: drawerName,
        timer: room.timer
    });
    
    io.to(roomId).emit("updatePlayers", room.players); // Re-broadcast to show 🎨 badge
    
    const dSocket = io.sockets.sockets.get(room.currentDrawer);
    if (dSocket) {
        dSocket.emit("wordOptions", options);
    }

    // clear canvas and history
    room.drawHistory = [];
    io.to(roomId).emit("clearCanvas");
    // Send a placeholder timer update during selection
    io.to(roomId).emit("timerUpdate", "80");

    // ============================================
    // Auto Pick Logic (8 Second Limit)
    // ============================================
    if (room.selectionTimeout) clearTimeout(room.selectionTimeout);
    
    const expectedDrawerId = room.currentDrawer;
    room.selectionTimeout = setTimeout(() => {
        // Only trigger if no word was picked yet, and room remains active under the original Drawer
        if (!room.word && room.currentDrawer === expectedDrawerId) {
            room.word = options[0];
            io.to(roomId).emit("wordChosen", room.word.length);
            
            const targetS = io.sockets.sockets.get(expectedDrawerId);
            if (targetS) targetS.emit("drawerWord", room.word);
            
            startRound(roomId);
        }
    }, 8000);
}

function startRound(roomId) {
    const room = rooms[roomId];
    if(!room) return;
    
    room.timer = 80; // 80 seconds per round
    
    // Setup the initial hint string array
    room.hintTokens = room.word.split("").map(char => char === " " ? "  " : "_");
    io.to(roomId).emit("wordHint", room.hintTokens.join(" "));
    
    // Clear any existing timer
    if(room.timerInterval) clearInterval(room.timerInterval);
    
    room.timerInterval = setInterval(() => {
        room.timer--;
        // Broadcast the remaining time to all room players
        io.to(roomId).emit("timerUpdate", room.timer);
        
        // Calculate Max Hints needed
        let maxHints = 3;
        if (room.word.length <= 3) maxHints = 1;
        else if (room.word.length === 4) maxHints = 2;

        // Distribute hint drop times based on allowed max hints
        let shouldDropHint = false;
        if (maxHints === 3 && (room.timer === 60 || room.timer === 40 || room.timer === 20)) shouldDropHint = true;
        if (maxHints === 2 && (room.timer === 55 || room.timer === 25)) shouldDropHint = true;
        if (maxHints === 1 && room.timer === 40) shouldDropHint = true;

        if (shouldDropHint) {
            let unrevealed = [];
            for (let i = 0; i < room.word.length; i++) {
                if (room.hintTokens[i] === "_") unrevealed.push(i);
            }
            if (unrevealed.length > 0) {
                const rndIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
                room.hintTokens[rndIndex] = room.word[rndIndex];
                io.to(roomId).emit("wordHint", room.hintTokens.join(" "));
            }
        }

        // Check if time is up
        if (room.timer <= 0) {
            clearInterval(room.timerInterval);
            io.to(roomId).emit("chatMessage", { sender: "System", text: `Time's up! The word was '${room.word || 'not chosen'}'` });
            const nextDrawerIdx = (room.currentPlayerIndex + 1) % room.players.length;
            const nextDrawer = room.players[nextDrawerIdx];
            io.to(roomId).emit("roundOver", { 
                word: room.word, 
                roundPoints: room.roundPoints || {}, 
                players: room.players,
                nextDrawerId: nextDrawer ? nextDrawer.id : null 
            });
            setTimeout(() => nextTurn(roomId), 10000);
        } 
        // Check if everyone (except drawer) has guessed the word correctly
        else if (room.word && room.guessedCorrectly.length === room.players.length - 1 && room.players.length > 1) {
             clearInterval(room.timerInterval);
             io.to(roomId).emit("chatMessage", { sender: "System", text: `Everyone guessed the word!` });
             
             const nextDrawerIdx = (room.currentPlayerIndex + 1) % room.players.length;
             const nextDrawer = room.players[nextDrawerIdx];
             io.to(roomId).emit("roundOver", { 
                 word: room.word, 
                 roundPoints: room.roundPoints || {}, 
                 players: room.players,
                 nextDrawerId: nextDrawer ? nextDrawer.id : null 
             });
             setTimeout(() => nextTurn(roomId), 10000);
        }
    }, 1000);
}

// Handle all Socket.io Events
io.on("connection", (socket) => {
    
    // Player joins a room
    socket.on("joinRoom", ({ playerName, roomId }, callback) => {
        // Prevent duplicate names in the same room
        if (rooms[roomId]) {
            const nameTaken = rooms[roomId].players.some(p => p.name.trim().toLowerCase() === playerName.trim().toLowerCase());
            if (nameTaken) {
                if (callback) callback({ error: `The name '${playerName}' is already taken in this room! Please choose a different name.` });
                return;
            }
        }
        
        socket.join(roomId);

        // Create the room structure if it doesn't exist yet
        if(!rooms[roomId]) {
            rooms[roomId] = {
                roomId,
                players: [],
                currentDrawer: null,
                word: "",
                timer: 0,
                timerInterval: null,
                currentPlayerIndex: -1,
                guessedCorrectly: [],
                roundPoints: {},
                kickVotes: {},
                selectionTimeout: null,
                drawHistory: [],
                usedWords: [] // Prevents identical words from showing again inside this room
            };
        }

        // Add player to the room
        const newPlayer = { id: socket.id, name: playerName, score: 0 };
        rooms[roomId].players.push(newPlayer);
        socket.roomId = roomId; // Store the room ID on the socket for future events
        
        // Broadcast updated player list and join message
        io.to(roomId).emit("updatePlayers", rooms[roomId].players);
        io.to(roomId).emit("chatMessage", { sender: "System", text: `${playerName} joined the room.` });

        // If at least 2 players are in the room and game hasn't started, start it
        if(rooms[roomId].players.length > 1 && !rooms[roomId].currentDrawer) {
            nextTurn(roomId);
        } else if (rooms[roomId].currentDrawer) {
            // Late joiner support: send current game state
            const room = rooms[roomId];
            const drawer = room.players.find(p => p.id === room.currentDrawer);
            socket.emit("turnStart", {
                drawerId: room.currentDrawer,
                drawerName: drawer ? drawer.name : "Someone",
                timer: room.timer || "80"
            });
            if (room.word) {
                socket.emit("wordChosen", room.word.length);
            }
            if (room.drawHistory && room.drawHistory.length > 0) {
                socket.emit("drawHistory", room.drawHistory);
            }
        }

        // Acknowledge successful join
        if (callback) callback({ success: true });
    });

    socket.on("chooseWord", (word) => {
        const room = rooms[socket.roomId];
        if(!room || room.currentDrawer !== socket.id || room.word !== "") return;
        
        // Track the word as used so it isn't shown again
        if (!room.usedWords) room.usedWords = [];
        room.usedWords.push(word);
        
        // Disable auto-pick since they manually clicked!
        if (room.selectionTimeout) {
            clearTimeout(room.selectionTimeout);
            room.selectionTimeout = null;
        }

        room.word = word;
        
        // Notify others about word length
        io.to(room.roomId).emit("wordChosen", word.length);
        // Only verify back to drawer what they picked
        socket.emit("drawerWord", word);

        // Start the timer for drawing visually
        startRound(room.roomId);
    });

    // Sync drawing coordinates
    socket.on("draw", (data) => {
         const room = rooms[socket.roomId];
         if(room && room.currentDrawer === socket.id) {
             if (room.drawHistory.length > 5000) room.drawHistory.shift(); // safety limit
             room.drawHistory.push({ type: "draw", data: data });
             socket.to(socket.roomId).emit("draw", data);
         }
    });

    // Sync Fill tools
    socket.on("fill", (data) => {
         const room = rooms[socket.roomId];
         if(room && room.currentDrawer === socket.id) {
             room.drawHistory.push({ type: "fill", data: data });
             socket.to(socket.roomId).emit("fill", data);
         }
    });

    // Sync Entire Canvas states (used by Undo/Redo for perfect pixel mapping)
    socket.on("syncCanvas", (dataStr) => {
         const room = rooms[socket.roomId];
         if(room && room.currentDrawer === socket.id) {
             // Collapse history into a single snapshot to prevent memory bloat
             room.drawHistory = [{ type: "syncCanvas", data: dataStr }];
             socket.to(socket.roomId).emit("syncCanvas", dataStr);
         }
    });

    // Sync clear canvas action
    socket.on("clearCanvas", () => {
         const room = rooms[socket.roomId];
         if(room && room.currentDrawer === socket.id) {
             room.drawHistory = [];
             io.to(socket.roomId).emit("clearCanvas");
         }
    });

    // Handle chat Messages and guesses
    socket.on("chatMessage", (msg) => {
        const room = rooms[socket.roomId];
        if(!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if(!player) return;

        // Guess checking logic: Make it case insensitive
        const isCorrectGuess = room.word && msg.toLowerCase() === room.word.toLowerCase();
        
        // Prevent Drawer from guessing, and prevent users who already guessed from guessing again
        if (isCorrectGuess && room.currentDrawer !== socket.id && !room.guessedCorrectly.includes(socket.id)) {
            // Correct guess!
            room.guessedCorrectly.push(socket.id);
            
            // Fair Scoring Formula:
            // 1. Guessers earn points smoothly tied to the raw percentage of time remaining.
            const pointsFromTime = Math.max(25, Math.floor((room.timer / 80) * 500));
            
            // 2. Prevent Drawer from getting 10x points in an 11 player lobby!
            // We strictly divide the reward by the total amount of guessers in the room,
            // capping the Drawer's maximum theoretical points to roughly match a 1st place guesser.
            const totalGuessers = Math.max(1, room.players.length - 1);
            const drawerPoints = Math.floor(pointsFromTime / totalGuessers);
            
            player.score += pointsFromTime;
            room.roundPoints[socket.id] = (room.roundPoints[socket.id] || 0) + pointsFromTime;
            
            // Reward Drawer for drawing well enough to be guessed
            const drawer = room.players.find(p => p.id === room.currentDrawer);
            if(drawer) {
                drawer.score += drawerPoints;
                room.roundPoints[drawer.id] = (room.roundPoints[drawer.id] || 0) + drawerPoints;
            }

            io.to(room.roomId).emit("updatePlayers", room.players);
            io.to(room.roomId).emit("chatMessage", { sender: "System", text: `${player.name} guessed the word!`, highlight: true });
        } 
        // If not a correct guess, it's just a normal chat message
        else if (!isCorrectGuess) {
             io.to(room.roomId).emit("chatMessage", { sender: player.name, text: msg });
        }
    });

    // Handle Democratic Voting to Kick
    socket.on("kickPlayer", (targetId) => {
        const room = rooms[socket.roomId];
        if(!room) return;
        
        // Ensure tracking exists
        if(!room.kickVotes) room.kickVotes = {};
        if(!room.kickVotes[targetId]) room.kickVotes[targetId] = new Set();
        
        // Register this player's vote
        room.kickVotes[targetId].add(socket.id);
        
        // Find target details
        const targetPlayer = room.players.find(p => p.id === targetId);
        const votingPlayer = room.players.find(p => p.id === socket.id);
        if(!targetPlayer || !votingPlayer) return;

        const currentVotes = room.kickVotes[targetId].size;
        // Total players excluding the target
        const requiredVotes = Math.max(1, Math.ceil((room.players.length - 1) * 0.6));
        
        // Announce the vote cast
        io.to(room.roomId).emit("chatMessage", { sender: "System", text: `[Vote Kick] ${votingPlayer.name} voted to kick ${targetPlayer.name} (${currentVotes}/${requiredVotes} required)` });

        // Kick logic
        if(currentVotes >= requiredVotes) {
            const targetSocket = io.sockets.sockets.get(targetId);
            if(targetSocket && targetSocket.roomId === socket.roomId) {
                 io.to(room.roomId).emit("chatMessage", { sender: "System", text: `${targetPlayer.name} was successfully kicked from the room.` });
                 targetSocket.emit("kicked");
                 targetSocket.leave(socket.roomId);
                 targetSocket.disconnect(true);
            }
        }
    });

    // Handle Disconnects
    socket.on("disconnect", () => {
        const roomId = socket.roomId;
        if(rooms[roomId]) {
            const room = rooms[roomId];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            
            if(playerIndex !== -1) {
                const playerName = room.players[playerIndex].name;
                room.players.splice(playerIndex, 1);
                
                // Cleanup their existing kick record mappings
                if(room.kickVotes && room.kickVotes[socket.id]) {
                    delete room.kickVotes[socket.id];
                }
                
                // Update players list and notify room
                io.to(roomId).emit("updatePlayers", room.players);
                io.to(roomId).emit("chatMessage", { sender: "System", text: `${playerName} left the room.` });

                if(room.players.length === 0) {
                    clearInterval(room.timerInterval);
                    delete rooms[roomId];
                } else if(room.currentDrawer === socket.id) {
                    // Drawer left
                    io.to(roomId).emit("chatMessage", { sender: "System", text: `⚠️ The current drawer disconnected! Skipping turn...` });
                    nextTurn(roomId);
                }
            }
        }
    });
});

// Load environment variables for local development
try {
    require("dotenv").config();
} catch (e) {
    // dotenv not installed, using system env or defaults
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
