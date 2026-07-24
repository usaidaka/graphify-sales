export type NodeType = 'internal' | 'external' | 'distributor' | 'special-external';

export interface NodeData {
  id: string; // The canonical abbreviation or normalized company name
  companyName: string; // Display name (canonical abbreviation)
  fullName?: string; // Full company name if available
  nodeType: NodeType;
  isImport?: boolean;
}

export interface EdgeData {
  id: string;
  source: string; // Seller canonical id
  target: string; // Buyer canonical id
  invoiceCount: number;
  totalDPP: number;
  totalPPN: number;
  datasets: string[];
  approvalStatus: string[];
  statuses: string[];
  periods: string[];
  isCancelledOrReplaced?: boolean;
}

export interface NormalizedGraph {
  nodes: NodeData[];
  edges: EdgeData[];
}

