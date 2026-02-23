import React, { useMemo } from 'react';
import { FieldType, PanelProps, GrafanaTheme2 } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';
import { TraefikFlowOptions, FlowNode, FlowEdge, StatusBuckets } from './types';
import { TraefikLogo } from './TraefikLogo';

const CONFIG = {
  defaults: {
    routerLabel: 'router',
    serviceLabel: 'service',
    codeLabel: 'code',
  },
  colors: {
    ok: '#2f8f2f',
    client: '#e0a400',
    server: '#d64545',
    empty: '#cfd4d8',
    line: '#5f6b73',
    text: '#1f2a33',
  },
  ribbon: {
    min: 6,
    max: 24,
  },
  dots: {
    diameter: 6,
  },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const scaleValue = (value: number, min: number, max: number, outMin: number, outMax: number) => {
  if (max <= min) {
    return (outMin + outMax) / 2;
  }
  const t = (value - min) / (max - min);
  return outMin + t * (outMax - outMin);
};

const scalePower = (value: number, min: number, max: number, outMin: number, outMax: number, gamma: number) => {
  if (max <= min) {
    return (outMin + outMax) / 2;
  }
  const t = (value - min) / (max - min);
  const eased = Math.pow(clamp(t, 0, 1), gamma);
  return outMin + eased * (outMax - outMin);
};

const estimateTextWidth = (text: string, charWidth = 6.6) => text.length * charWidth;

const emptyBuckets = (): StatusBuckets => ({ ok: 0, client: 0, server: 0 });

const bucketForCode = (codeValue: string | number | undefined): keyof StatusBuckets => {
  const code = typeof codeValue === 'number' ? codeValue : Number.parseInt(codeValue ?? '', 10);
  if (Number.isFinite(code) && code >= 200 && code <= 399) {
    return 'ok';
  }
  if (Number.isFinite(code) && code >= 400 && code <= 499) {
    return 'client';
  }
  return 'server';
};

const sumFieldValues = (values: any): number => {
  if (!values || typeof values.length !== 'number') {
    return 0;
  }
  let total = 0;
  for (let i = 0; i < values.length; i += 1) {
    const v = values.get ? values.get(i) : values[i];
    if (typeof v === 'number' && Number.isFinite(v)) {
      total += v;
    }
  }
  return total;
};

const buildNode = (cx: number, cy: number, radius: number, thickness: number, buckets: StatusBuckets) => {
  const total = buckets.ok + buckets.client + buckets.server;
  if (total <= 0) {
    return [
      {
        d: describeArc(cx, cy, radius, 0, 359.999),
        color: CONFIG.colors.empty,
      },
    ];
  }

  const segments = [
    { value: buckets.ok, color: CONFIG.colors.ok },
    { value: buckets.client, color: CONFIG.colors.client },
    { value: buckets.server, color: CONFIG.colors.server },
  ];

  let startAngle = 0;
  return segments
    .filter((seg) => seg.value > 0)
    .map((seg) => {
      const angle = (seg.value / total) * 360;
      const endAngle = startAngle + angle;
      const d = describeArc(cx, cy, radius, startAngle, endAngle);
      startAngle = endAngle;
      return { d, color: seg.color, thickness };
    });
};

const polarToCartesian = (cx: number, cy: number, radius: number, angleDeg: number) => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
};

const describeArc = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(' ');
};

const formatCount = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return Math.round(value).toString();
};

const buildFlow = (
  props: PanelProps<TraefikFlowOptions>,
  theme: GrafanaTheme2
): { nodes: FlowNode[]; edges: FlowEdge[] } => {
  const { data, width, height, options } = props;
  const routerLabel = options.routerLabel ?? CONFIG.defaults.routerLabel;
  const serviceLabel = options.serviceLabel ?? CONFIG.defaults.serviceLabel;
  const codeLabel = options.codeLabel ?? CONFIG.defaults.codeLabel;
  const hideZeroNodes = options.hideZeroNodes ?? false;

  const routerTotals = new Map<string, StatusBuckets>();
  const serviceTotals = new Map<string, StatusBuckets>();
  const routerServiceTotals = new Map<string, Map<string, number>>();

  for (const series of data.series) {
    for (const field of series.fields) {
      if (field.type !== FieldType.number) {
        continue;
      }
      const labels = field.labels || {}; // || series.labels 
      const router = labels[routerLabel];
      const service = labels[serviceLabel];
      const code = labels[codeLabel];
      if (!router || !service) {
        continue;
      }

      const valueSum = sumFieldValues(field.values);
      const bucket = bucketForCode(code);

      const routerBuckets = routerTotals.get(router) ?? emptyBuckets();
      routerBuckets[bucket] += valueSum;
      routerTotals.set(router, routerBuckets);

      const serviceBuckets = serviceTotals.get(service) ?? emptyBuckets();
      serviceBuckets[bucket] += valueSum;
      serviceTotals.set(service, serviceBuckets);

      const serviceMap = routerServiceTotals.get(router) ?? new Map<string, number>();
      serviceMap.set(service, (serviceMap.get(service) ?? 0) + valueSum);
      routerServiceTotals.set(router, serviceMap);
    }
  }

  const paddingX = 0;
  const paddingY = 0;
  const labelGap = 16;
  const traefikX = width / 2;
  const routerList = Array.from(routerTotals.entries())
    .filter(([, buckets]) => !hideZeroNodes || buckets.ok + buckets.client + buckets.server > 0)
    .sort((a, b) => {
      const at = a[1].ok + a[1].client + a[1].server;
      const bt = b[1].ok + b[1].client + b[1].server;
      return bt - at;
    });
  const serviceList = Array.from(serviceTotals.entries())
    .filter(([, buckets]) => !hideZeroNodes || buckets.ok + buckets.client + buckets.server > 0)
    .sort((a, b) => {
      const at = a[1].ok + a[1].client + a[1].server;
      const bt = b[1].ok + b[1].client + b[1].server;
      return bt - at;
    });
  const serviceNames = serviceList.map(([name]) => name);
  const servicePalette = buildServicePalette(serviceNames, options.palette ?? 'theme', theme);

  const routerTotalsValues = routerList.map(([, buckets]) => buckets.ok + buckets.client + buckets.server);
  const serviceTotalsValues = serviceList.map(([, buckets]) => buckets.ok + buckets.client + buckets.server);
  const allTotals = [...routerTotalsValues, ...serviceTotalsValues];
  const minTotal = allTotals.length > 0 ? Math.min(...allTotals) : 0;
  const maxTotal = allTotals.length > 0 ? Math.max(...allTotals) : 1;

  const sizeMin = 18;
  const sizeMax = 48;
  const barWidth = 4;
  const thicknessScale = 1.25;

  const buildStackedPositions = (items: Array<[string, StatusBuckets]>) => {
    const sizes = items.map(([, buckets]) => {
      const total = buckets.ok + buckets.client + buckets.server;
      const diameter = scalePower(total, minTotal, maxTotal, sizeMin, sizeMax, 0.6);
      return clamp(diameter, sizeMin, sizeMax);
    });
    const count = items.length;
    const step = count > 0 ? (height - paddingY * 2) / (count + 1) : 0;
    const positions = items.map((_, idx) => paddingY + step * (idx + 1));
    return { positions, sizes };
  };

  const routerLayout = buildStackedPositions(routerList);
  const serviceLayout = buildStackedPositions(serviceList);

  const routerLabelWidths = routerList.map(([name, buckets]) => {
    const total = buckets.ok + buckets.client + buckets.server;
    const countText = `${formatCount(total)} req/h`;
    return Math.max(estimateTextWidth(name), estimateTextWidth(countText));
  });
  const serviceLabelWidths = serviceList.map(([name, buckets]) => {
    const total = buckets.ok + buckets.client + buckets.server;
    const countText = `${formatCount(total)} req/h`;
    return Math.max(estimateTextWidth(name), estimateTextWidth(countText));
  });
  const maxRouterLabelWidth = routerLabelWidths.length > 0 ? Math.max(...routerLabelWidths) : 0;
  const maxServiceLabelWidth = serviceLabelWidths.length > 0 ? Math.max(...serviceLabelWidths) : 0;
  const maxRouterRadius = barWidth / 2;
  const maxServiceRadius = barWidth / 2;
  const routerX = paddingX + maxRouterLabelWidth + labelGap + maxRouterRadius;
  const serviceX = Math.max(paddingX, width - paddingX - maxServiceLabelWidth - labelGap - maxServiceRadius);

  const nodes: FlowNode[] = [];

  routerList.forEach(([router, buckets], index) => {
    const total = buckets.ok + buckets.client + buckets.server;
    const diameter = routerLayout.sizes[index] ?? sizeMin;
    nodes.push({
      id: `router:${router}`,
      label: router,
      kind: 'router',
      total,
      buckets,
      x: routerX,
      y: routerLayout.positions[index] ?? paddingY,
      radius: barWidth / 2,
      thickness: diameter * thicknessScale,
    });
  });

  const traefikBuckets = emptyBuckets();
  for (const buckets of routerTotals.values()) {
    traefikBuckets.ok += buckets.ok;
    traefikBuckets.client += buckets.client;
    traefikBuckets.server += buckets.server;
  }

  const traefikDiameter = scaleValue(
    traefikBuckets.ok + traefikBuckets.client + traefikBuckets.server,
    minTotal,
    Math.max(maxTotal, traefikBuckets.ok + traefikBuckets.client + traefikBuckets.server),
    sizeMin + 6,
    sizeMax + 8
  );
  const traefikNode: FlowNode = {
    id: 'traefik',
    label: 'Traefik',
    kind: 'traefik',
    total: traefikBuckets.ok + traefikBuckets.client + traefikBuckets.server,
    buckets: traefikBuckets,
    x: traefikX,
    y: height / 2,
    radius: traefikDiameter / 2,
    thickness: traefikDiameter * thicknessScale,
  };
  nodes.push(traefikNode);

  serviceList.forEach(([service, buckets], index) => {
    const total = buckets.ok + buckets.client + buckets.server;
    const diameter = serviceLayout.sizes[index] ?? sizeMin;
    nodes.push({
      id: `service:${service}`,
      label: service,
      kind: 'service',
      total,
      buckets,
      x: serviceX,
      y: serviceLayout.positions[index] ?? paddingY,
      radius: barWidth / 2,
      thickness: diameter * thicknessScale,
    });
  });

  const edges: FlowEdge[] = [];
  for (const node of nodes) {
    if (node.kind === 'router') {
      const serviceMap = routerServiceTotals.get(node.label);
      let dominantService = '';
      let dominantValue = -1;
      if (serviceMap) {
        for (const [service, total] of serviceMap.entries()) {
          if (total > dominantValue) {
            dominantValue = total;
            dominantService = service;
          }
        }
      }
      const edgeColor = servicePalette.get(dominantService) ?? CONFIG.colors.line;
      const widthStart = scalePower(node.total, minTotal, maxTotal, CONFIG.ribbon.min, CONFIG.ribbon.max, 0.7);
      const widthEnd = scalePower(traefikNode.total, minTotal, maxTotal, CONFIG.ribbon.min, CONFIG.ribbon.max, 0.7);
      const width = Math.min(widthStart, widthEnd);
      edges.push({
        id: `edge:${node.id}:traefik`,
        from: node,
        to: traefikNode,
        total: node.total,
        widthStart: width,
        widthEnd: width,
        color: edgeColor,
      });
    }
  }
  for (const node of nodes) {
    if (node.kind === 'service') {
      const edgeColor = servicePalette.get(node.label) ?? CONFIG.colors.line;
      const widthStart = scalePower(node.total, minTotal, maxTotal, CONFIG.ribbon.min, CONFIG.ribbon.max, 0.7);
      const widthEnd = scalePower(traefikNode.total, minTotal, maxTotal, CONFIG.ribbon.min, CONFIG.ribbon.max, 0.7);
      const width = Math.min(widthStart, widthEnd);
      edges.push({
        id: `edge:traefik:${node.id}`,
        from: traefikNode,
        to: node,
        total: node.total,
        widthStart: width,
        widthEnd: width,
        color: edgeColor,
      });
    }
  }

  return { nodes, edges };
};

const NodeGlyph = ({
  node,
  logoUrl,
  textColor,
  textMuted,
}: {
  node: FlowNode;
  logoUrl?: string;
  textColor: string;
  textMuted: string;
}) => {
  const labelFont = 11;
  const countFont = 10;
  const countText = `${formatCount(node.total)} req/h`;
  const nodeThickness = clamp(node.radius * 0.2, 4, 6);
  const donutRadius = node.radius + nodeThickness * 2;
  const nodes = buildNode(node.x, node.y, donutRadius, nodeThickness, node.buckets);
  const barWidth = 4;
  const barHeight = 24;
  const barX = node.x - barWidth / 2;
  const barY = node.y - barHeight / 2;
  const barTotal = node.buckets.ok + node.buckets.client + node.buckets.server;
  const okHeight = barTotal > 0 ? (node.buckets.ok / barTotal) * barHeight : 0;
  const clientHeight = barTotal > 0 ? (node.buckets.client / barTotal) * barHeight : 0;
  const serverHeight = barTotal > 0 ? (node.buckets.server / barTotal) * barHeight : 0;
  const labelPaddingX = 6;

  return (
    <g>
      {node.kind === 'traefik' && (
        <>
          <circle
            cx={node.x}
            cy={node.y}
            r={node.radius + 12}
            fill="#ffffff"
          />
          {nodes.map((seg, idx) => (
            <path
              key={`${node.id}-seg-${idx}`}
              d={seg.d}
              fill="none"
              stroke={seg.color}
              strokeWidth={nodeThickness}
              strokeLinecap="round"
            />
          ))}
          <TraefikLogo x={node.x} y={node.y} size={node.radius * 2.3} />
        </>
      )}
      {node.kind !== 'traefik' && (
        <>
          <rect x={barX} y={barY} width={barWidth} height={barHeight} fill="#ffffff" stroke={CONFIG.colors.line} strokeWidth={1.5} />
          {barTotal > 0 ? (
            <>
              <rect x={barX} y={barY} width={barWidth} height={okHeight} fill={CONFIG.colors.ok} />
              <rect x={barX} y={barY + okHeight} width={barWidth} height={clientHeight} fill={CONFIG.colors.client} />
              <rect x={barX} y={barY + okHeight + clientHeight} width={barWidth} height={serverHeight} fill={CONFIG.colors.server} />
            </>
          ) : (
            <rect x={barX} y={barY} width={barWidth} height={barHeight} fill={CONFIG.colors.empty} />
          )}
        </>
      )}
      {node.kind === 'router' && (
        <>
          <text
            x={node.x - barWidth / 2 - labelPaddingX}
            y={node.y - 2}
            textAnchor="end"
            fontSize={labelFont}
            fontFamily="'Space Grotesk', 'Arial Black', sans-serif"
            fill={textColor}
          >
            {node.label}
          </text>
          <text
            x={node.x - barWidth / 2 - labelPaddingX}
            y={node.y + 12}
            textAnchor="end"
            fontSize={countFont}
            fontFamily="'Space Grotesk', 'Arial Black', sans-serif"
            fill={textMuted}
          >
            {countText}
          </text>
        </>
      )}
      {node.kind === 'service' && (
        <>
          <text
            x={node.x + barWidth / 2 + labelPaddingX}
            y={node.y - 2}
            textAnchor="start"
            fontSize={labelFont}
            fontFamily="'Space Grotesk', 'Arial Black', sans-serif"
            fill={textColor}
          >
            {node.label}
          </text>
          <text
            x={node.x + barWidth / 2 + labelPaddingX}
            y={node.y + 12}
            textAnchor="start"
            fontSize={countFont}
            fontFamily="'Space Grotesk', 'Arial Black', sans-serif"
            fill={textMuted}
          >
            {countText}
          </text>
        </>
      )}
      {node.kind === 'traefik' && null}
    </g>
  );
};

const hashToUnit = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
};

const hashColor = (value: string) => {
  const hue = Math.round(hashToUnit(value) * 360);
  return `hsl(${hue}, 45%, 55%)`;
};

const buildServicePalette = (services: string[], mode: string, theme: GrafanaTheme2) => {
  const palette = new Map<string, string>();
  let colors: string[] = [];

  if (mode.startsWith('hue:')) {
    const hueName = mode.replace('hue:', '');
    const hue = theme.visualization.hues.find((h) => h.name.toLowerCase() === hueName.toLowerCase());
    if (hue) {
      colors = hue.shades.map((shade) => theme.visualization.getColorByName(shade.name ?? shade.color));
    }
  }

  if (colors.length === 0) {
    colors = theme.visualization.palette.map((c) => theme.visualization.getColorByName(c));
  }

  services.forEach((service, index) => {
    const color = colors[index % colors.length];
    palette.set(service, color);
  });
  return palette;
};

const edgeAnchors = (from: FlowNode, to: FlowNode) => {
  const direction = Math.sign(to.x - from.x) || 1;
  const startX = from.x + direction * from.radius;
  const endX = to.x - direction * to.radius;
  return { startX, endX, midX: (startX + endX) / 2 };
};

const ribbonPath = (from: FlowNode, to: FlowNode, widthStart: number, widthEnd: number) => {
  const { startX, endX, midX } = edgeAnchors(from, to);
  const hs = widthStart / 2;
  const he = widthEnd / 2;
  const c1x = midX;
  const c1y = from.y;
  const c2x = midX;
  const c2y = to.y;

  const sx = startX;
  const sy = from.y + hs;
  const ex = endX;
  const ey = to.y + he;
  const sx2 = startX;
  const sy2 = from.y - hs;
  const ex2 = endX;
  const ey2 = to.y - he;

  return [
    'M',
    sx,
    sy,
    'C',
    c1x,
    c1y + hs,
    c2x,
    c2y + he,
    ex,
    ey,
    'L',
    ex2,
    ey2,
    'C',
    c2x,
    c2y - he,
    c1x,
    c1y - hs,
    sx2,
    sy2,
    'Z',
  ].join(' ');
};

const getDotMetrics = (edge: FlowEdge, minTotal: number, maxTotal: number) => {
  const maxWidth = Math.max(edge.widthStart, edge.widthEnd);
  const duration = clamp((6 - (maxWidth / 48) * 3) * 2, 2.4, 12);
  const valueDensity = maxTotal > 0 ? scalePower(edge.total, minTotal, maxTotal, 0, 1, 0.7) : 0;
  const density = edge.total > 0 ? Math.max(1, Math.round(valueDensity * 12)) : 0;
  const interval = density > 0 ? duration / density : 0;
  return { density, duration, interval };
};

const FlowLines = ({
  edges,
  metrics,
}: {
  edges: FlowEdge[];
  metrics: Map<string, ReturnType<typeof getDotMetrics>>;
}) => {
  const dotDiameter = CONFIG.dots.diameter;
  const totals = edges.map((edge) => edge.total);
  const minTotal = totals.length ? Math.min(...totals) : 0;
  const maxTotal = totals.length ? Math.max(...totals) : 0;
  return (
    <g>
      {edges.map((edge) => {
        const { from, to } = edge;
        const { startX, endX, midX } = edgeAnchors(from, to);
        const { density, duration } = metrics.get(edge.id) ?? getDotMetrics(edge, minTotal, maxTotal);
        const ribbonColor = edge.color || hashColor(edge.id);

        const clipId = `clip-${edge.id}`;
        return (
          <g key={edge.id}>
            <defs>
              <clipPath id={clipId}>
                <path d={ribbonPath(from, to, edge.widthStart, edge.widthEnd)} />
              </clipPath>
            </defs>
            <path
              d={ribbonPath(from, to, edge.widthStart, edge.widthEnd)}
              fill={ribbonColor}
              opacity={0.22}
            />
            <g clipPath={`url(#${clipId})`}>
              {density > 0 &&
                Array.from({ length: density }).map((_, idx) => {
                  const radius = dotDiameter / 2;
                  const dur = duration;
                  const phase = (idx + 0.5) / Math.max(density, 1);
                  const begin = -(phase * dur);
                  const path = `M ${startX} ${from.y} C ${midX} ${from.y} ${midX} ${to.y} ${endX} ${to.y}`;
                  return (
                    <circle key={`${edge.id}-dot-${idx}`} r={radius} fill={ribbonColor} opacity={0.8}>
                      <animateMotion
                        dur={`${dur}s`}
                        repeatCount="indefinite"
                        begin={`${begin}s`}
                        path={path}
                        rotate="auto"
                        keyPoints={`0;1`}
                        keyTimes="0;1"
                        calcMode="linear"
                      />
                    </circle>
                  );
                })}
            </g>
          </g>
        );
      })}
    </g>
  );
};

export const TraefikFlowPanel: React.FC<PanelProps<TraefikFlowOptions>> = (props) => {
  const { width, height } = props;
  const theme = useTheme2();
  const { nodes, edges } = useMemo(() => buildFlow(props, theme), [props, theme]);
  const metrics = useMemo(() => {
    const totals = edges.map((edge) => edge.total);
    const minTotal = totals.length ? Math.min(...totals) : 0;
    const maxTotal = totals.length ? Math.max(...totals) : 0;
    const map = new Map<string, ReturnType<typeof getDotMetrics>>();
    edges.forEach((edge) => {
      map.set(edge.id, getDotMetrics(edge, minTotal, maxTotal));
    });
    return map;
  }, [edges]);
  const textColor = theme.colors?.text?.primary ?? CONFIG.colors.text;
  const textMuted = theme.colors?.text?.secondary ?? textColor;

  if (width < 200 || height < 120) {
    return <div style={{ padding: 16, color: textColor }}>Panel is too small.</div>;
  }
  
  return (
    <svg width={width} height={height}>
      <FlowLines edges={edges} metrics={metrics} />
      {nodes.map((node) => (
        <NodeGlyph key={node.id} node={node} textColor={textColor} textMuted={textMuted} />
      ))}
    </svg>
  );
};
