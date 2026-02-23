export interface TraefikFlowOptions {
  routerLabel?: string;
  serviceLabel?: string;
  codeLabel?: string;
  traefikLogoUrl?: string;
  palette?: string;
  hideZeroNodes?: boolean;
}

export type StatusBuckets = {
  ok: number;
  client: number;
  server: number;
};

export type NodeKind = 'router' | 'traefik' | 'service';

export interface FlowNode {
  id: string;
  label: string;
  kind: NodeKind;
  total: number;
  buckets: StatusBuckets;
  x: number;
  y: number;
  radius: number;
  thickness: number;
}

export interface FlowEdge {
  id: string;
  from: FlowNode;
  to: FlowNode;
  total: number;
  widthStart: number;
  widthEnd: number;
  color: string;
}
