export function dijkstra(graph, startNodeId, endNodeId) {
  const visited = new Set();
  const distances = {};
  const previous = {};
  const nodes = Object.keys(graph.nodes);

  nodes.forEach((nodeId) => {
    distances[nodeId] = Number.POSITIVE_INFINITY;
  });

  distances[startNodeId] = 0;

  while (visited.size < nodes.length) {
    let currentNode = null;
    let currentDistance = Number.POSITIVE_INFINITY;

    nodes.forEach((nodeId) => {
      if (!visited.has(nodeId) && distances[nodeId] < currentDistance) {
        currentNode = nodeId;
        currentDistance = distances[nodeId];
      }
    });

    if (!currentNode || currentDistance === Number.POSITIVE_INFINITY) {
      break;
    }

    visited.add(currentNode);

    const node = graph.nodes[currentNode];
    Object.entries(node.neighbors).forEach(([neighborId, weight]) => {
      const nextDistance = distances[currentNode] + weight;
      if (nextDistance < distances[neighborId]) {
        distances[neighborId] = nextDistance;
        previous[neighborId] = currentNode;
      }
    });

    if (currentNode === endNodeId) {
      break;
    }
  }

  if (distances[endNodeId] === Number.POSITIVE_INFINITY) {
    return [];
  }

  const path = [];
  let cursor = endNodeId;
  while (cursor) {
    path.unshift(cursor);
    cursor = previous[cursor];
  }

  return path;
}
