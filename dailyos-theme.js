(function(root){
const catalog = {
  og:       { label:"OG", motion:"Orbital light", swatch:["#F59E0B","#10B981","#8B5CF6","#06B6D4"] },
  crimson:  { label:"Crimson", motion:"Silk ribbons", swatch:["hsl(348 88% 74%)","hsl(348 85% 60%)","hsl(348 74% 44%)"] },
  solar:    { label:"Solar", motion:"Sunlit halos", swatch:["hsl(46 92% 70%)","hsl(38 95% 58%)","hsl(28 80% 46%)"] },
  aqua:     { label:"Aqua", motion:"Gentle tides", swatch:["hsl(184 82% 68%)","hsl(189 88% 54%)","hsl(202 74% 44%)"] },
  violet:   { label:"Violet", motion:"Crystal facets", swatch:["hsl(274 82% 78%)","hsl(262 86% 68%)","hsl(248 70% 52%)"] },
  emerald:  { label:"Emerald", motion:"Emerald facets", swatch:["hsl(166 74% 64%)","hsl(156 80% 52%)","hsl(142 68% 40%)"] },
  graphite: { label:"Graphite", motion:"Sculpted contours", swatch:["hsl(220 16% 84%)","hsl(220 13% 64%)","hsl(220 12% 46%)"] },
  midnight: { label:"Midnight", motion:"Quiet constellations", swatch:["hsl(207 90% 74%)","hsl(217 95% 62%)","hsl(228 76% 50%)"] },
  sakura:   { label:"Sakura", motion:"Drifting blossoms", swatch:["hsl(350 88% 82%)","hsl(340 80% 70%)","hsl(326 64% 52%)"] },
  ember:    { label:"Ember", motion:"Rising sparks", swatch:["hsl(32 88% 68%)","hsl(22 88% 55%)","hsl(10 72% 44%)"] },
  synthwave:{ label:"Synthwave", motion:"Neon horizons", swatch:["hsl(315 90% 62%)","hsl(265 85% 68%)","hsl(185 95% 58%)"] },
  aurora:   { label:"Aurora", motion:"Northern lights", swatch:["hsl(140 78% 66%)","hsl(170 85% 55%)","hsl(196 80% 50%)"] },
  modern: {label:"Modern",motion:"Matte stone & linen",symbol:"◒",rich:true,swatch:["#875c47","#715d4e","#ede6dc"],meaning:"Warm spaces, quiet daily rituals",palette:"Bone, greige and espresso with a restrained clay accent."},
  pokemon: {label:"Pokémon",motion:"Clouds & Poké Balls",symbol:"◓",rich:true,swatch:["#245da0","#9c302d","#ffe18a"],meaning:"Friendship, adventure, growing together",palette:"Open blue skies, warm sunlight and each partner’s type colors."},
  akatsuki: {label:"Akatsuki",motion:"Red clouds & ink",symbol:"",rich:true,swatch:["#ff8190","#ffffff","#090909"],meaning:"Pain, loss and unyielding ambition",palette:"Black cloak layers, crimson clouds and white trim."},
  vintage: {label:"Vintage",motion:"Paper & printing ink",symbol:"❦",rich:true,swatch:["#e7bf8c","#bcd2bc","#d8bde4"],meaning:"Printed pages, a slower rhythm",palette:"Oat, sage and dusty lilac soften warm ink tones."},
  zen: {label:"Zen Garden",motion:"Raked sand & stones",symbol:"◎",rich:true,swatch:["#c5d3a0","#e8c29b","#b7d6cd"],meaning:"Enso circles, balance and renewal",palette:"Moss, rice paper and clay evoke a quiet garden."},
  lagoon: {label:"Tidal Lagoon",motion:"Sea glass & coral",symbol:"⌁",rich:true,swatch:["#9edcd1","#f1beb2","#bdd1ee"],meaning:"Coral branches, life below the tide",palette:"Sea glass and softened coral gently balance cool depths."},
  dunes: {label:"Desert Loom",motion:"Woven cloth & dunes",symbol:"◒",rich:true,swatch:["#efbc9d","#d0c4e8","#bed3bb"],meaning:"Dunes and woven paths, steady journeys",palette:"Terracotta, mauve and sage echo a muted desert dusk."},
  observatory: {label:"Observatory",motion:"Celestial brass & velvet",symbol:"✧",rich:true,swatch:["#d6c8ef","#e8ce9f","#afd8dd"],meaning:"Astrolabes, perspective and possibility",palette:"Lavender slate, brass and mist blue soften the night."},
};
const aliases = { OG:"og", Teal:"aqua", Violet:"violet", Crimson:"crimson" };
const normalize=key=>catalog[key]?key:(aliases[key]||"og");
const apply=key=>{
  const k=normalize(key),html=root.document.documentElement;
  html.dataset.theme=k;html.dataset.identity=catalog[k].rich?"rich":"classic";
  html.toggleAttribute("data-character-theme",["pokemon","akatsuki"].includes(k));
};
root.DailyTheme={catalog,aliases,normalize,apply};
let saved="og";
try{saved=JSON.parse(root.localStorage.getItem("dos_theme_v1"))||"og";}catch{}
root.document.documentElement.dataset.page="home";
apply(saved);
})(window);
