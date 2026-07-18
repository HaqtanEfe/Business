/* ============================================================================
   content.js — all editable copy/data for the haqtanefe.dev business page.
   Edit values here; the markup in index.html is rendered from this file by app.js.
   Ported 1:1 from Haktan's Claude Design mockup ("Roblox Developer Portfolio").
   ========================================================================== */
window.CONTENT = {

  /* Hue bot avatar in the Discord mock. Drop your image at Business/assets/hue.png
     (or change this path). Falls back to an "H" monogram if the file is missing. */
  hueAvatar: "assets/hue.png",

  /* About-section photo. If set, this overrides the auto-fetched Roblox headshot.
     Leave as null/"" to fall back to the Roblox avatar-headshot from /api/stats. */
  photo: "assets/avatar.jpg",

  /* Accent swatches for the theme picker (persisted to localStorage). */
  swatches: [
    { color: "#C4A6FF", name: "Violet", glow: "rgba(196,166,255,0.11)" },
    { color: "#C6F84E", name: "Lime",   glow: "rgba(198,248,78,0.10)"  },
    { color: "#5EEAD4", name: "Teal",   glow: "rgba(94,234,212,0.10)"  },
    { color: "#FF8A5E", name: "Coral",  glow: "rgba(255,138,94,0.10)"  }
  ],

  /* Terminal card — real Luau puzzle snippets, cycled every 5.5s, pause on hover. */
  snippets: [
    { file: "Bezier.lua", code:
`--!strict

local function quadraticBezier(p0: Vector3, p1: Vector3, p2: Vector3, t: number): Vector3
  local a = p0:Lerp(p1, t)
  local b = p1:Lerp(p2, t)
  return a:Lerp(b, t)
end

local function cubicBezier(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, t: number): Vector3
  local a = quadraticBezier(p0, p1, p2, t)
  local b = quadraticBezier(p1, p2, p3, t)
  return a:Lerp(b, t)
end

local midpoint = cubicBezier(
  Vector3.new(0, 0, 0),
  Vector3.new(0, 5, 0),
  Vector3.new(5, 5, 0),
  Vector3.new(5, 0, 0),
  0.5
)
print(midpoint) --> 2.5, 3.75, 0` },
    { file: "Cooldown.lua", code:
`--!strict

local Cooldown = {}
Cooldown.__index = Cooldown

function Cooldown.new(duration: number)
  return setmetatable({
    duration = duration,
    lastUsed = -math.huge,
  }, Cooldown)
end

function Cooldown:tryUse(): boolean
  if os.clock() - self.lastUsed >= self.duration then
    self.lastUsed = os.clock()
    return true
  end
  return false
end

local dash = Cooldown.new(3)
print(dash:tryUse()) --> true
print(dash:tryUse()) --> false` },
    { file: "Gcd.lua", code:
`--!strict

local function greatestCommonDivisor(first: number, second: number): number
  while second ~= 0 do
    first, second = second, first % second
  end
  return math.abs(first)
end

print(greatestCommonDivisor(48, 36)) --> 12` },
    { file: "IsPrime.lua", code:
`--!strict

local function isPrime(number: number): boolean
  if number < 2 then return false end
  if number < 4 then return true end -- 2 and 3
  if number % 2 == 0 or number % 3 == 0 then return false end

  local divisor = 5
  while divisor * divisor <= number do
    if number % divisor == 0 or number % (divisor + 2) == 0 then
      return false
    end
    divisor += 6
  end

  return true
end

print(isPrime(29))      --> true
print(isPrime(1000003)) --> true` },
    { file: "Shuffle.lua", code:
`--!strict

local function shuffle<T>(list: { T }): { T }
  for index = #list, 2, -1 do
    local swapWith = math.random(1, index)
    list[index], list[swapWith] = list[swapWith], list[index]
  end
  return list
end

local deck = { "A", "K", "Q", "J", "10" }
print(table.concat(shuffle(deck), " "))` },
    { file: "Constants.lua", code:
`--!strict

type ConstantsTable = {
  MaxPlayers: number,
  Gravity: number,
}

local Constants = setmetatable({} :: ConstantsTable, {
  __index = {
    MaxPlayers = 10,
    Gravity = 196.2,
  },
  __newindex = function(_, key: string)
    error("Constants are read-only, cannot set '" .. key .. "'", 2)
  end,
})

print(Constants.MaxPlayers) --> 10

local ok, err = pcall(function()
  Constants.MaxPlayers = 20
end)
print(ok, err) --> false, read-only` },
    { file: "ObjectPool.lua", code:
`--!strict

local Pool = {}
Pool.__index = Pool

type Pool = typeof(setmetatable(
  {} :: { free: { Instance }, src: Instance },
  Pool
))

function Pool.new(src: Instance, n: number): Pool
  local self = setmetatable({ free = {}, src = src }, Pool)
  for _ = 1, n do
    table.insert(self.free, src:Clone())
  end
  return self
end

function Pool:get(): Instance
  return table.remove(self.free) or self.src:Clone()
end` },
    { file: "LootRoll.lua", code:
`--!strict

type LootEntry = { id: string, weight: number }

local function rollLoot(pool: { LootEntry }): string?
  local total = 0
  for _, i in ipairs(pool) do
    total += i.weight
  end
  local roll = math.random() * total
  for _, i in ipairs(pool) do
    roll -= i.weight
    if roll <= 0 then return i.id end
  end
  return nil
end

print(rollLoot({
  { id = "common", weight = 70 },
  { id = "rare",   weight = 25 },
  { id = "mythic", weight = 5 },
}))` }
  ],

  /* Fallback for the WORK cards if /api/stats is unavailable. Live data (real
     thumbnails + live visit counts + game links) comes from api/stats.js. The
     static `visits` here is the number shown when the live count can't be found. */
  projectsFallback: [
    { placeId: "12452509832",    tag: "skin system & optimization", title: "Getting Over It [Remastered]", desc: "A brutal climbing challenge — scale an impossible mountain with nothing but a hammer.", visits: 108000000 },
    { placeId: "71575927487690", tag: "scripted the entire game",   title: "Build a Brainrot",             desc: "Collect and combine the internet's favourite brainrots, grow your base, and out-produce the server.", visits: 26000000 },
    { placeId: "10222333249",    tag: "checkpoint system, animations + additional bugfixes & features", title: "Star's Glitch Per Difficulty Chart Obby", desc: "A glitch-based difficulty-chart obby that ramps up stage by stage — only a small percentage ever finish it.", visits: 2546095 },
    { placeId: "12278997443",    tag: "handled marketplace features, some animations + additional features", title: "Aqua's Glitch Per Difficulty Chart Obby", desc: "A difficulty-chart obby with every stage tested and progress auto-saved as you climb.", visits: 1119198 },
    { placeId: "106193613636888",tag: "event system + features",    title: "[🦄] Steal a Among Us",         desc: "Sneak into rival bases, steal their prized units, and defend your own in a fast-paced steal-and-run.", visits: 28000 },
    { placeId: "14839350618",    tag: "scripted (with a partner)",  title: "[👑OVER] SPIN TO WIN!",         desc: "Spin for a shot at rare rewards, climb the ranks, and gamble your way to the top of the leaderboard.", visits: 9500 },
    { placeId: "133989351175623",tag: "scripted the entire game",   title: "Build Tower For Brainrots!",    desc: "Stack, balance and defend an ever-growing tower of brainrots against everything the game throws at it.", visits: 9300 }
  ],

  skills: [
    { tag: "scripting",    title: "Luau Backend",             desc: "Server-authoritative systems, module architecture, and clean OOP that other devs can extend." },
    { tag: "frontend",     title: "Frontend / GUI Logic",     desc: "Responsive interfaces, HUDs, and menu flows wired tightly to the backend." },
    { tag: "networking",   title: "Server-Client Replication", desc: "Reliable sync, multi-server lobbies, and solid anti-exploit checks." },
    { tag: "game systems", title: "Game Systems",             desc: "Cosmetics, inventory, shops, and UGC integration wired straight into your economy." },
    { tag: "optimization", title: "Optimization",             desc: "High-traffic performance, memory profiling, and server load tuning at scale." },
    { tag: "workflow",     title: "Workflow",                 desc: "Rojo / Argon sync, Git version control, modular reusable design, and clear client comms." }
  ],

  tech: ["Luau", "Roblox Studio", "Rojo", "Argon", "Git", "ModuleScripts", "RemoteEvents", "DataStores", "OOP", "Multi-server", "Cosmetics & Inventory", "UGC Integration", "Memory Profiling", "Server Tuning"],

  hueFeatures: [
    { tag: "self-serve", title: "Small tweaks, instantly", desc: "Change values yourself; Hue applies them, no waiting on me." },
    { tag: "summaries",  title: "Catch-up summaries",     desc: "Hue recaps a long thread so nothing slips." },
    { tag: "on request", title: "Reaches me when you ask", desc: "Ask Hue to loop me in and it pings me directly." },
    { tag: "always on",  title: "24/7 in your channel",   desc: "Lives in our Discord for the whole build." }
  ],

  chats: [
    { time: "2:14 PM", client: "can we bump the sprint speed to 24 and make the shop button green?",
      hue: "Done ✓, set WalkSpeed to 24 and recolored the shop button to green. Both are live in Studio now. Want a summary of today's changes?", paged: false },
    { time: "4:47 PM", client: "the leaderboard isn't saving for some players, can you get HaqtanEfe on this?",
      hue: "On it. I reproduced the issue, and since you asked, I've pinged HaqtanEfe directly. I've logged the affected sessions so he can jump straight in.", paged: true, ping: "HaqtanEfe pinged because you asked · usually replies within an hour" },
    { time: "9:02 AM", client: "quick recap of what changed yesterday?",
      hue: "Yesterday: WalkSpeed 16 to 24, shop button recolored, and a fix to the daily-reward timer. 3 changes, all live, nothing needs HaqtanEfe right now.", paged: false }
  ],

  steps: [
    { n: "1", tag: "BRIEF",   title: "Send a brief",      desc: "Fill out the form or DM me. I reply within the hour with any questions to lock down scope." },
    { n: "2", tag: "QUOTE",   title: "Quote & timeline",  desc: "You get a fixed price range and a realistic timeline before a single line is written." },
    { n: "3", tag: "BUILD",   title: "I build it",        desc: "I script in a copy of your place, with Hue posting updates so you can follow progress live." },
    { n: "4", tag: "DELIVER", title: "Deliver & support", desc: "Tested, documented, and full ownership handed over. Bugs I caused are fixed free, always." }
  ],

  /* tagColor / border use "accent" as a sentinel -> app.js swaps in var(--accent). */
  tiers: [
    { tag: "FIXES",        title: "Basic Fixes",         price: "$20–50",  unit: "/ task",     desc: "Bug fixes, small tweaks, and single-behavior changes to existing scripts.", accent: false },
    { tag: "SYSTEMS",      title: "Basic Systems",       price: "$30–80",  unit: "/ system",   desc: "Standalone features: shops, leaderboards, and simple gameplay loops.",      accent: false },
    { tag: "MOST POPULAR", title: "Advanced Systems",    price: "$80–200", unit: "/ project",  desc: "Multi-part systems: matchmaking, inventory, shops, and progression.",       accent: true  },
    { tag: "FULL GAME",    title: "Full Game Scripting", price: "$200–2K", unit: "+ by scope", desc: "End-to-end: gameplay, backend, optimization, and final polish.",             accent: false }
  ],

  payments: ["Robux → DevEx", "Crypto", "BuyMeACoffee", "Roblox gift cards"],

  faqs: [
    { q: "How many revisions do I get?", a: "As many as it takes for you to be happy with the result. Revisions that involve big changes to the original scope may carry an extra charge, and I'll always tell you before anything is billable." },
    { q: "How long will my project take?", a: "Small jobs can be done in a few hours. Larger builds can run up to around two weeks, though most wrap in under a week. You'll get a realistic timeline together with your quote." },
    { q: "How does payment work?", a: "Whatever's comfortable for you: pay upfront, or split it per task as the work lands. I accept Robux, crypto, BuyMeACoffee, and Roblox gift cards, in that order of preference." },
    { q: "What if I find a bug after delivery?", a: "If it's something I caused, I fix it for free. Bugs from other causes, or large fixes on older work, are paid, but I'll always be straight with you about which it is." },
    { q: "Who owns the code once it's done?", a: "You do, full ownership. The only thing you can't do is claim you wrote it yourself. I leave a short credit comment at the top of my scripts so anyone who opens them knows who wrote it and who to contact for help. And if you have a credits section, adding me there would be highly appreciated, it costs you nothing and I get recognition for the work I did." },
    { q: "Can you keep my project confidential?", a: "Absolutely. You can opt out of the Hue assistant entirely, and anything we discuss stays strictly between us." },
    { q: "Is there anything you don't build?", a: "A couple of things: no vehicle systems, and no AI / NPC navigation systems. Everything else (backend, frontend, gameplay, and optimization) is fair game." },
    { q: "How do we get started?", a: "DM me on Discord, or drop a short brief in the form below and I will contact you." }
  ],

  /* Client reviews. Each card's avatar resolves in this order:
       1. `avatar`      — an image path/URL you set here (override, e.g. a studio logo)
       2. `robloxUserId`— fetched Roblox headshot for that user (for named clients)
       3. `anon: true`  — a "verified via rodevs" badge (for anonymous reviews)
       4. `initial`     — a single letter, last-resort fallback
     To add a named client later:
       { tag:"advanced system", stars:"★★★★★", robloxUserId: 123456,
         name:"@theirHandle", role:"Simulator · 30M visits", quote:"..." }
     To override with a custom image (studios, logos):
       { ..., avatar:"assets/reviews/theirlogo.png", ... } */
  reviews: [
    { tag: "scripted the game", stars: "★★★★★", robloxUserId: 4261512249, name: "@monkee915", role: "Owner · Build a Brainrot", quote: "", note: "Verified 5★ review" },
    { tag: "verified · rodevs", stars: "★★★★★", anon: true, name: "Anonymous client", role: "via rodevs", quote: "He is very skilled and quick, making him great to work with." },
    { tag: "verified · rodevs", stars: "★★★★★", anon: true, name: "Anonymous client", role: "via rodevs", quote: "Very nice, clean and easily customisable scripts. He scripted a whole system for me in a day." },
    { tag: "verified · rodevs", stars: "★★★★★", anon: true, name: "Anonymous client", role: "via rodevs", quote: "Delivery was very fast and the quality was beyond words." }
  ],

  /* Iris section — showcases Haktan's own to-do app (iris.haqtanefe.dev) as a
     client-progress tool: every commission gets a live, read-only share board.
       demoUrl   — the public /s/<token> share link the demo button opens.
                   Leave "" to fall back to appUrl until a board is shared.
       screenshot— a capture of that board, shown framed in the section. */
  iris: {
    demoUrl: "https://iris.haqtanefe.dev/s/2lEBx7A4sV-bBDdQlZ0xT",
    appUrl: "https://iris.haqtanefe.dev",
    screenshot: "assets/iris.png",
    features: [
      { tag: "LIVE PROGRESS",   title: "A bar that actually moves", desc: "Updates the moment I check a task off." },
      { tag: "FULL BREAKDOWN",  title: "Every task & subtask",      desc: "Every system, priority-coded — what's shipped and what's next." },
      { tag: "ONE PRIVATE LINK",title: "Open it anywhere",          desc: "Read-only link, no login, works on your phone." },
      { tag: "BUILT BY ME",     title: "Not a template",            desc: "My own product — the engineering you're hiring." }
    ]
  }
};
