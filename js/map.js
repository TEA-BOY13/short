import { buildCampusGraph } from './graph.js';
import { dijkstra } from './dijkstra.js';

console.log('map.js loading...');

const svg = document.getElementById('campusMap');
const startSelect = document.getElementById('startSelect');
const endSelect = document.getElementById('endSelect');
const routeBtn = document.getElementById('routeBtn');
const clearBtn = document.getElementById('clearBtn');
const summary = document.getElementById('summary');

console.log('DOM elements loaded', { svg: !!svg, startSelect: !!startSelect });


let graph = null;
let buildingNames = [];
let currentRoute = [];
let buildingsGeojson = null;

// Track initialization state
window.initState = {
  started: false,
  completed: false,
  error: null,
  graphNodeCount: 0
};

function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function renderCampus(roadsGeojson, buildingsGeojson) {
  svg.innerHTML = '';

  const background = createSvgElement('rect', {
    x: 0,
    y: 0,
    width: 1000,
    height: 700,
    fill: 'transparent'
  });
  svg.appendChild(background);

  const roadLayer = createSvgElement('g', { id: 'road-layer' });
  roadsGeojson.features.forEach((feature) => {
    const coords = feature.geometry.coordinates;
    const pathData = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point[0]} ${point[1]}`).join(' ');
    const line = createSvgElement('path', {
      d: pathData,
      stroke: '#5d8f6e',
      'stroke-width': 10,
      fill: 'none',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: 0.8
    });
    roadLayer.appendChild(line);
  });
  svg.appendChild(roadLayer);

  const nodeLayer = createSvgElement('g', { id: 'node-layer' });
  roadsGeojson.features.forEach((feature) => {
    const coords = feature.geometry.coordinates;
    coords.forEach((point) => {
      const circle = createSvgElement('circle', {
        cx: point[0],
        cy: point[1],
        r: 4,
        fill: '#1f4f3d'
      });
      nodeLayer.appendChild(circle);
    });
  });
  svg.appendChild(nodeLayer);

  const buildingLayer = createSvgElement('g', { id: 'building-layer' });
  buildingsGeojson.features.forEach((feature) => {
    const [x, y] = feature.geometry.coordinates;
    const marker = createSvgElement('rect', {
      x: x - 12,
      y: y - 12,
      width: 24,
      height: 24,
      rx: 6,
      fill: '#f59e0b',
      stroke: '#7c3f00',
      'stroke-width': 2
    });
    buildingLayer.appendChild(marker);

    const label = createSvgElement('text', {
      x: x + 18,
      y: y + 4,
      fill: '#14213d',
      'font-size': 13,
      'font-family': 'Segoe UI, sans-serif'
    });
    label.textContent = feature.properties?.name || 'Building';
    buildingLayer.appendChild(label);
  });
  svg.appendChild(buildingLayer);

  const routeLayer = createSvgElement('g', { id: 'route-layer' });
  svg.appendChild(routeLayer);
}

function drawRoute(pathIds) {
  const routeLayer = document.getElementById('route-layer');
  if (!routeLayer) return;
  routeLayer.innerHTML = '';

  if (pathIds.length < 2) return;

  const points = pathIds.map((id) => {
    const node = graph.nodes[id];
    return `${node.x},${node.y}`;
  });

  const polyline = createSvgElement('polyline', {
    points: points.join(' '),
    fill: 'none',
    stroke: '#ef4444',
    'stroke-width': 8,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    opacity: 0.95
  });
  routeLayer.appendChild(polyline);

  pathIds.forEach((id) => {
    const node = graph.nodes[id];
    const circle = createSvgElement('circle', {
      cx: node.x,
      cy: node.y,
      r: 5,
      fill: '#ef4444',
      stroke: '#fff',
      'stroke-width': 2
    });
    routeLayer.appendChild(circle);
  });
}

function getRouteInfo(pathIds) {
  if (pathIds.length < 2) {
    return { distance: 0, time: 0 };
  }

  let distance = 0;
  for (let index = 0; index < pathIds.length - 1; index += 1) {
    const fromNode = graph.nodes[pathIds[index]];
    const toNode = graph.nodes[pathIds[index + 1]];
    distance += Math.hypot(fromNode.x - toNode.x, fromNode.y - toNode.y);
  }

  const walkingMinutes = Math.max(4, Math.round((distance / 90) * 60));
  return { distance: distance.toFixed(1), time: walkingMinutes };
}

function populateSelects() {
  const options = buildingNames.map((name) => `<option value="${name}">${name}</option>`).join('');
  startSelect.innerHTML = options;
  endSelect.innerHTML = options;
  startSelect.value = buildingNames[0];
  endSelect.value = buildingNames[Math.min(1, buildingNames.length - 1)] || buildingNames[0];
}

async function init() {
  try {
    console.log('Init starting');
    
    console.log('Fetching data...');
    const [roadsGeojson, buildingsData] = await Promise.all([
      fetch('./data/roads.geojson').then((response) => {
        console.log('Roads fetch response:', response.status);
        return response.json();
      }),
      fetch('./data/buildings.geojson').then((response) => {
        console.log('Buildings fetch response:', response.status);
        return response.json();
      })
    ]);

    buildingsGeojson = buildingsData;
    console.log('GeoJSON loaded', { roadsCount: roadsGeojson.features.length, buildingsCount: buildingsData.features.length });
    
    console.log('Building graph...');
    console.log('buildCampusGraph function exists:', typeof buildCampusGraph);
    
    const graphResult = buildCampusGraph(roadsGeojson, buildingsGeojson);
    console.log('buildCampusGraph returned:', graphResult);
    console.log('graphResult.nodes exists:', graphResult?.nodes ? true : false);
    
    graph = graphResult;
    window.initState.graphNodeCount = Object.keys(graph.nodes).length;
    console.log('Graph built successfully', { nodesCount: window.initState.graphNodeCount, keys: Object.keys(graph.nodes).slice(0, 5) });
    
    buildingNames = buildingsGeojson.features.map((feature) => feature.properties?.name).filter(Boolean);
    console.log('Building names extracted', buildingNames);
    
    populateSelects();
    console.log('Selects populated');
    
    renderCampus(roadsGeojson, buildingsGeojson);
    console.log('Campus rendered');

    routeBtn.addEventListener('click', () => {
      const startName = startSelect.value;
      const endName = endSelect.value;
      const startNodeId = buildingNames.includes(startName) ? buildingsGeojson.features.find((feature) => feature.properties?.name === startName).properties.id || startName.replace(/\s+/g, '-').toLowerCase() : startName;
      const endNodeId = buildingNames.includes(endName) ? buildingsGeojson.features.find((feature) => feature.properties?.name === endName).properties.id || endName.replace(/\s+/g, '-').toLowerCase() : endName;

      console.log('Computing route', { startName, startNodeId, endName, endNodeId });
      const path = dijkstra(graph, startNodeId, endNodeId);
      console.log('Route computed', { pathLength: path.length, path });
      
      currentRoute = path;
      drawRoute(path);

      const info = getRouteInfo(path);
      summary.innerHTML = `Route ready. Estimated distance: <strong>${info.distance} units</strong> · Walking time: <strong>${info.time} min</strong>`;
    });

    clearBtn.addEventListener('click', () => {
      drawRoute([]);
      summary.innerHTML = 'Choose a start and destination to generate a route.';
    });
    
    console.log('Init completed successfully');
    if (window.initState) window.initState.completed = true;
  } catch (error) {
    console.error('Init error:', error);
    console.error('Stack trace:', error.stack);
    if (window.initState) {
      window.initState.error = error.message;
      window.initState.stack = error.stack;
    }
    summary.innerHTML = `Unable to load campus data: ${error.message}`;
  }
}

// Start initialization
console.log('About to call init()');
init().then(() => {
  console.log('Init promise resolved');
  if (window.initState) window.initState.started = true;
}).catch(err => {
  console.error('Init promise rejected:', err);
  if (window.initState) {
    window.initState.started = true;
    window.initState.error = err.message;
  }
});
