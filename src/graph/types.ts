export type NodeType = 'internal' | 'external' | 'distributor' | 'special-external';

export interface NodeData {
  id: string; // The normalized company name
  companyName: string; // Original display name
  nodeType: NodeType;
}

export interface EdgeData {
  id: string;
  source: string; // Seller normalized name
  target: string; // Buyer normalized name
  invoiceCount: number;
  totalDPP: number;
  totalPPN: number;
  datasets: string[];
  approvalStatus: string[];
  periods: string[];
}

export interface NormalizedGraph {
  nodes: NodeData[];
  edges: EdgeData[];
}
