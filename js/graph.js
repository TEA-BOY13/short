export function buildCampusGraph(roadsGeojson, buildingsGeojson) {
  const nodes = {};
  const roadSegments = [];

  const ensureNode = (id, label, x, y) => {
    if (!nodes[id]) {
      nodes[id] = { id, label, x, y, neighbors: {} };
    }
    return nodes[id];
  };

  const addEdge = (fromId, toId, weight) => {
    if (!nodes[fromId] || !nodes[toId]) return;
    nodes[fromId].neighbors[toId] = weight;
    nodes[toId].neighbors[fromId] = weight;
  };

  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  roadsGeojson.features.forEach((feature) => {
    const coords = feature.geometry.coordinates;
    const roadName = feature.properties?.name || feature.properties?.id || "Road";

    for (let index = 0; index < coords.length - 1; index += 1) {
      const from = coords[index];
      const to = coords[index + 1];
      const fromId = `${roadName}-p${index}`;
      const toId = `${roadName}-p${index + 1}`;

      ensureNode(fromId, `${roadName} junction`, from[0], from[1]);
      ensureNode(toId, `${roadName} junction`, to[0], to[1]);
      addEdge(fromId, toId, distance(from, to));
      roadSegments.push({ from, to });
    }
  });

  buildingsGeojson.features.forEach((building) => {
    const buildingId = building.properties?.id || building.properties?.name.replace(/\s+/g, "-").toLowerCase();
    const [x, y] = building.geometry.coordinates;
    ensureNode(buildingId, building.properties?.name || "Building", x, y);

    // Connect every building to the nearest road node for route calculation.
    let nearestId = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    Object.values(nodes).forEach((node) => {
      if (node.id === buildingId) return;
      const d = Math.hypot(node.x - x, node.y - y);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearestId = node.id;
      }
    });

    if (nearestId) {
      addEdge(buildingId, nearestId, nearestDistance * 0.35);
    }
  });

  return { nodes, roadSegments };
}
