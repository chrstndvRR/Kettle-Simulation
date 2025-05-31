// Initialize Elements
const water = document.querySelector('.water-fill');
const ice = document.querySelector('.ice-fill');
const bubblesCanvas = document.querySelector('.bubble-canvas');
const bubblesCtx = bubblesCanvas.getContext('2d');
const steamCanvas = document.querySelector('.steam-canvas');
const steamCtx = steamCanvas.getContext('2d');
const heater = document.getElementById('heater');
const cooler = document.getElementById('cooler');
const thermoFill = document.getElementById('thermo-fill');
const freezeWarning = document.querySelector('.freeze-warning');
const boilWarning = document.querySelector('.boil-warning');

// Table Elements
const celsiusTd = document.getElementById('celsius-td');
const fahrenheitTd = document.getElementById('fahrenheit-td');
const kelvinTd = document.getElementById('kelvin-td');
const expansionTd = document.getElementById('expansion-td');
const stressTd = document.getElementById('stress-td');
const workTd = document.getElementById('work-td');
const entropyTd = document.getElementById('entropy-td');

// Simulation State
const state = {
  temperature: 20,
  isHeating: false,
  isCooling: false,
  bubbles: [],
  steamParticles: [],
  maxWaterHeight: bubblesCanvas.offsetHeight,
  lastUpdate: Date.now(),
  volume: 1.0 // Initial volume in arbitrary units
};

// Physics Constants
const PHYSICS = {
  boilingPoint: 100,
  freezingPoint: 0,
  maxTemp: 120,
  minTemp: -10,
  expansionRate: 0.004,
  bubbleThreshold: 70,
  heatRate: 0.35,
  coolRate: 0.3,
  ambientCooling: 0.05,
  materialConstant: 1.2e-5, // For thermal stress calculation
  elasticity: 2e9, // Young's modulus (Pa)
  specificHeat: 4186 // J/kg°C for water
};

// Initialize Canvases
function init() {
  bubblesCanvas.width = bubblesCanvas.offsetWidth;
  bubblesCanvas.height = bubblesCanvas.offsetHeight;
  steamCanvas.width = steamCanvas.offsetWidth;
  steamCanvas.height = steamCanvas.offsetHeight;
  state.maxWaterHeight = bubblesCanvas.height;
  updateWater();
  updateDisplays();
}

// Calculate thermodynamic properties
function calculateProperties() {
  const tempDiff = state.temperature - 20;
  
  // Volumetric expansion (percentage)
  const expansion = (tempDiff * PHYSICS.expansionRate * 100).toFixed(2);
  
  // Thermal stress (simplified linear expansion stress)
  const stress = (PHYSICS.materialConstant * PHYSICS.elasticity * tempDiff / 1000).toFixed(2);
  
  // Thermal work (Q = mcΔT, simplified)
  const work = (state.volume * PHYSICS.specificHeat * tempDiff).toFixed(0);
  
  // Entropy change (ΔS = mc ln(T2/T1), simplified)
  const entropy = (Math.log((state.temperature + 273.15)/293.15)).toFixed(4);
  
  return { expansion, stress, work, entropy };
}

// Update all displays
function updateDisplays() {
  // Convert temperatures
  const fahrenheit = (state.temperature * 9/5) + 32;
  const kelvin = state.temperature + 273.15;
  
  // Update temperature table
  celsiusTd.textContent = state.temperature.toFixed(1);
  fahrenheitTd.textContent = fahrenheit.toFixed(1);
  kelvinTd.textContent = kelvin.toFixed(1);
  
  // Calculate and update thermodynamic properties
  const { expansion, stress, work, entropy } = calculateProperties();
  expansionTd.textContent = `${expansion}%`;
  stressTd.textContent = `${stress} kPa`;
  workTd.textContent = `${work} J`;
  entropyTd.textContent = `${entropy} J/K`;
  
  // Update warnings
  if (state.temperature <= PHYSICS.freezingPoint + 5) {
    freezeWarning.style.opacity = '1';
  } else {
    freezeWarning.style.opacity = '0';
  }
  
  if (state.temperature >= PHYSICS.boilingPoint - 5) {
    boilWarning.style.opacity = '1';
  } else {
    boilWarning.style.opacity = '0';
  }
}

// Main Animation Loop
function update() {
  const now = Date.now();
  const deltaTime = (now - state.lastUpdate) / 1000; // in seconds
  state.lastUpdate = now;
  
  updateTemperature(deltaTime);
  updateWater();
  updateBubbles();
  updateSteam();
  updateThermometer();
  updateDisplays();
  requestAnimationFrame(update);
}

// Temperature Control
function updateTemperature(deltaTime) {
  // Active heating/cooling
  if (state.isHeating) {
    state.temperature += PHYSICS.heatRate * deltaTime * 60;
    if (state.temperature > PHYSICS.bubbleThreshold) {
      state.temperature += 0.05 * deltaTime * 60;
    }
  }
  else if (state.isCooling) {
    state.temperature -= PHYSICS.coolRate * deltaTime * 60;
    if (state.temperature < PHYSICS.freezingPoint + 10) {
      state.temperature -= 0.05 * deltaTime * 60;
    }
  }
  // Passive cooling
  else {
    const tempDiff = state.temperature - 20; // ambient temperature
    if (Math.abs(tempDiff) > 0.5) {
      state.temperature -= Math.sign(tempDiff) * PHYSICS.ambientCooling * deltaTime * 60;
    }
  }
  
  state.temperature = Math.max(PHYSICS.minTemp, Math.min(PHYSICS.maxTemp, state.temperature));
}

// Water Physics
function updateWater() {
  // Thermal expansion
  const expansionFactor = 1 + (state.temperature - 20) * PHYSICS.expansionRate;
  state.volume = expansionFactor; // Update volume for calculations
  water.style.height = `${state.maxWaterHeight * expansionFactor}px`;
  
  // Phase transitions
  if (state.temperature <= PHYSICS.freezingPoint) {
    const iceHeight = Math.min(1, (PHYSICS.freezingPoint - state.temperature) / 10 + 1);
    ice.style.height = `${state.maxWaterHeight * iceHeight}px`;
    ice.style.opacity = '1';
    water.style.opacity = '0';
  } else if (state.temperature >= PHYSICS.boilingPoint) {
    const evaporation = Math.min(1, (state.temperature - PHYSICS.boilingPoint) / 20);
    water.style.opacity = `${1 - evaporation}`;
    ice.style.opacity = '0';
  } else {
    water.style.opacity = '1';
    ice.style.opacity = '0';
  }
}

// Bubble System
function updateBubbles() {
  bubblesCtx.clearRect(0, 0, bubblesCanvas.width, bubblesCanvas.height);
  
  // Add bubbles when hot
  if (state.temperature > PHYSICS.bubbleThreshold && Math.random() < 0.3) {
    const bubbleIntensity = (state.temperature - PHYSICS.bubbleThreshold) / 30;
    for (let i = 0; i < bubbleIntensity * 2; i++) {
      state.bubbles.push({
        x: Math.random() * bubblesCanvas.width,
        y: bubblesCanvas.height,
        size: Math.random() * 4 + 2 * bubbleIntensity,
        speed: Math.random() * 3 + 1 * bubbleIntensity,
        life: 100
      });
    }
  }
  
  // Update bubbles
  state.bubbles.forEach((bubble, i) => {
    bubble.y -= bubble.speed;
    bubble.x += Math.sin(Date.now() * 0.001 + i) * 0.5;
    bubble.life -= 1;
    
    bubblesCtx.fillStyle = `rgba(255, 255, 255, ${bubble.life / 150})`;
    bubblesCtx.beginPath();
    bubblesCtx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
    bubblesCtx.fill();
    
    if (bubble.y < -10 || bubble.life <= 0) {
      state.bubbles.splice(i, 1);
    }
  });
}

// Steam System
function updateSteam() {
  steamCtx.clearRect(0, 0, steamCanvas.width, steamCanvas.height);
  
  // Add steam when boiling
  if (state.temperature >= PHYSICS.boilingPoint) {
    const steamIntensity = (state.temperature - PHYSICS.boilingPoint) / 20;
    if (Math.random() < steamIntensity * 0.5) {
      state.steamParticles.push({
        x: Math.random() * steamCanvas.width,
        y: steamCanvas.height,
        size: Math.random() * 10 + 5 * steamIntensity,
        speed: Math.random() * 2 + 1 * steamIntensity,
        sway: Math.random() * 0.02
      });
    }
  }
  
  // Update steam
  state.steamParticles.forEach((particle, i) => {
    particle.y -= particle.speed;
    particle.x += Math.sin(Date.now() * particle.sway) * 2;
    particle.size *= 0.98;
    
    const gradient = steamCtx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, particle.size
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.3 * (particle.size / 15)})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    steamCtx.fillStyle = gradient;
    steamCtx.beginPath();
    steamCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    steamCtx.fill();
    
    if (particle.size < 0.5) {
      state.steamParticles.splice(i, 1);
    }
  });
}

// Thermometer
function updateThermometer() {
  const tempRange = PHYSICS.maxTemp - PHYSICS.minTemp;
  const tempPercent = ((state.temperature - PHYSICS.minTemp) / tempRange) * 100;
  thermoFill.style.height = `${tempPercent}%`;
  
  // Dynamic color (blue to red)
  const hue = 240 - (tempPercent * 2.4);
  thermoFill.style.background = `hsl(${hue}, 100%, 50%)`;
}

// Event Listeners
heater.addEventListener('mousedown', () => state.isHeating = true);
heater.addEventListener('mouseup', () => state.isHeating = false);
heater.addEventListener('mouseleave', () => state.isHeating = false);
heater.addEventListener('touchstart', () => state.isHeating = true, {passive: true});
heater.addEventListener('touchend', () => state.isHeating = false, {passive: true});

cooler.addEventListener('mousedown', () => state.isCooling = true);
cooler.addEventListener('mouseup', () => state.isCooling = false);
cooler.addEventListener('mouseleave', () => state.isCooling = false);
cooler.addEventListener('touchstart', () => state.isCooling = true, {passive: true});
cooler.addEventListener('touchend', () => state.isCooling = false, {passive: true});

// Start Simulation
init();
update();
