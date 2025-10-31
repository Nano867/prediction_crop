// script.js
// Sample static site logic for rule-based crop recommendation
// Edit crop definitions or rules easily in the arrays below.

// --- 1) Governorates list and simplified region classification
const governorates = [
  { name: "Cairo", region: "Delta" },
  { name: "Giza", region: "Delta" },
  { name: "Fayoum", region: "Delta" },
  { name: "Dakahlia", region: "Delta" },
  { name: "Kafr El-Sheikh", region: "Delta" },
  { name: "Minya", region: "Upper" },
  { name: "Beni Suef", region: "Upper" },
  { name: "Aswan", region: "Upper" },
  { name: "North Sinai", region: "Sinai" },
  // add others as needed...
];

// --- 2) Crop definitions (ideal temp ranges Celsius, preferred soils, water)
const crops = [
  {
    id: "wheat",
    name: "Wheat (Triticum aestivum)",
    tempRange: [17, 24],
    soils: ["clay", "loam"],
    water: "moderate",
    months: [11,12,1,2,3,4] // Nov - Apr (plant Nov-Dec)
  },
  {
    id: "rice",
    name: "Rice (Oryza sativa)",
    tempRange: [20,30],
    soils: ["clay"],
    water: "high",
    months: [4,5,6,7,8,9] // Apr - Sep
  },
  {
    id: "maize",
    name: "Maize (Zea mays)",
    tempRange: [25,35],
    soils: ["loam","sandy loam"],
    water: "moderate-high",
    months: [5,6,7,8,9,10]
  },
  {
    id: "barley",
    name: "Barley (Hordeum vulgare)",
    tempRange: [15,22],
    soils: ["varied"],
    water: "low",
    months: [11,12,1,2,3]
  },
  // add more crops (tomato, potato, dates, citrus etc) as needed...
];

// --- 3) Sample monthly average temperatures by region (approx, degrees C)
// These values are placeholders to allow local predictions.
// Replace these with real Terra/GEE values later.
const sampleMonthlyTemps = {
  "Delta": [17,18,21,24,27,30,32,31,29,26,22,18], // Jan..Dec
  "Upper": [19,20,24,28,31,34,36,35,33,29,25,20],
  "Sinai": [16,17,20,24,28,31,33,32,30,26,21,17]
};

// --- Utility functions
function monthIndex(m){ return m - 1; }

function getRegionTemp(region, month){
  const arr = sampleMonthlyTemps[region];
  if(!arr) return null;
  return arr[monthIndex(month)];
}

// rule engine: checks crop suitability by temperature and month
function evaluateCrops(region, month){
  const temp = getRegionTemp(region, month);
  const results = [];
  crops.forEach(c => {
    // check month window
    const monthOk = c.months.includes(month);
    // check temperature range
    const [tmin, tmax] = c.tempRange;
    const tempOk = (temp !== null) ? (temp >= tmin && temp <= tmax) : false;
    // simple scoring
    let score = 0;
    if(monthOk) score += 1;
    if(tempOk) score += 2;
    // water/soil checks would use other inputs (not present here)
    if(score >= 2){ // threshold to recommend
      results.push({
        id: c.id, name: c.name, score, tempMatch: tempOk, monthMatch: monthOk,
        idealTemp: `${tmin}–${tmax}`, regionTemp: temp, water: c.water, soils: c.soils.join(", ")
      });
    }
  });
  // sort by score desc
  results.sort((a,b) => b.score - a.score);
  return { temp, results };
}

// --- UI wiring
const govSelect = document.getElementById("govSelect");
governorates.forEach(g => {
  const opt = document.createElement("option");
  opt.value = g.name;
  opt.textContent = g.name;
  govSelect.appendChild(opt);
});
const monthSelect = document.getElementById("monthSelect");
const predictBtn = document.getElementById("predictBtn");
const resultBox = document.getElementById("resultBox");
const showRulesBtn = document.getElementById("showRulesBtn");
const cropTableDiv = document.getElementById("cropTable");

function renderCropReference(){
  cropTableDiv.innerHTML = "";
  crops.forEach(c => {
    const div = document.createElement("div");
    div.className = "crop-card";
    div.innerHTML = `<h4>${c.name}</h4>
      <p><strong>Ideal Temperature:</strong> ${c.tempRange[0]}–${c.tempRange[1]} °C</p>
      <p><strong>Soil:</strong> ${c.soils.join(", ")}</p>
      <p><strong>Water needs:</strong> ${c.water}</p>
      <p class="small"><strong>Best months:</strong> ${c.months.map(m => new Date(0, m-1).toLocaleString('en', {month:'long'})).join(", ")}</p>`;
    cropTableDiv.appendChild(div);
  });
}
renderCropReference();

predictBtn.addEventListener("click", () => {
  const gov = govSelect.value;
  const month = parseInt(monthSelect.value);
  if(!gov){ alert("Please select a governorate."); return; }
  const region = governorates.find(g => g.name === gov).region;
  const {temp, results} = evaluateCrops(region, month);

  resultBox.classList.remove("hidden");
  if(!results.length){
    resultBox.innerHTML = `<strong>No strong match found.</strong>
      <p>Region average temp: ${temp} °C (month: ${new Date(0,month-1).toLocaleString('en',{month:'long'})}).</p>
      <p>Consider soil test and local irrigation before planting.</p>`;
    return;
  }

  let html = `<h3>Recommended crops for ${gov} (${region}) - ${new Date(0,month-1).toLocaleString('en',{month:'long'})}</h3>`;
  html += `<p>Region mean temperature: <strong>${temp} °C</strong></p>`;
  html += `<ul>`;
  results.forEach(r => {
    html += `<li><strong>${r.name}</strong> — Match score: ${r.score}. Ideal temp: ${r.idealTemp} °C. Water: ${r.water}. Soils: ${r.soils}.</li>`;
  });
  html += `</ul>`;
  html += `<p class="small">Note: This is a rule-based recommendation. Replace sample temps with Terra/GEE values for higher accuracy.</p>`;
  resultBox.innerHTML = html;
});

// Show rules popup
showRulesBtn.addEventListener("click", () => {
  let txt = "Prediction rules (editable):\n\n";
  crops.forEach(c => {
    txt += `${c.name}\n - months: ${c.months.join(", ")}\n - temp: ${c.tempRange[0]}–${c.tempRange[1]} °C\n - soils: ${c.soils.join(", ")}\n\n`;
  });
  alert(txt);
});

/* ====== Placeholder: how to connect real Terra/GEE data ======
  - Option A: Use Earth Engine (Python or JS) to compute monthly average LST per governorate,
    export as CSV, and call backend API to fetch latest values.
  - Option B: Use LAADS/LP DAAC API to download MODIS products, process server-side, then expose endpoints.
  Implementation notes:
  - Replace sampleMonthlyTemps with values returned from backend: sampleMonthlyTemps[region][monthIndex] = realValue
*/