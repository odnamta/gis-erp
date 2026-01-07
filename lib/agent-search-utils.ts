// =====================================================
// v0.71: AGENT SEARCH UTILITY FUNCTIONS
// =====================================================

import {
  ShippingRate,
  PortAgent,
  BestRateResult,
  RateSearchParams,
  PortAgentService,
} from '@/types/agency';
import { isRateValid } from './rate-calculation-utils';

/**
 * Filter rates to only include active and valid rates
 * Property 2: Active Record Filtering
 * 
 * @param rates - Array of shipping rates
 * @param date - Date to check validity against (default: current date)
 * @returns Filtered array of active, valid rates
 */
export function filterActiveRates(rates: ShippingRate[], date?: Date): ShippingRate[] {
  return rates.filter(rate => isRateValid(rate, date));
}

/**
 * Filter agents to only include active agents
 * Property 2: Active Record Filtering
 * 
 * @param agents - Array of port agents
 * @returns Filtered array of active agents
 */
export function filterActiveAgents(agents: PortAgent[]): PortAgent[] {
  return agents.filter(agent => agent.isActive);
}

/**
 * Sort rates by total rate in ascending order
 * Property 6: Rate Search Ordering
 * 
 * @param rates - Array of shipping rates
 * @returns Sorted array (lowest rate first)
 */
export function sortRatesByTotal(rates: ShippingRate[]): ShippingRate[] {
  return [...rates].sort((a, b) => a.totalRate - b.totalRate);
}

/**
 * Sort agents by preferred status (preferred first) then by rating (highest first)
 * Property 7: Agent Search Ordering
 * 
 * @param agents - Array of port agents
 * @returns Sorted array
 */
export function sortAgentsByPreferredAndRating(agents: PortAgent[]): PortAgent[] {
  return [...agents].sort((a, b) => {
    // First sort by preferred (true comes first)
    if (a.isPreferred !== b.isPreferred) {
      return a.isPreferred ? -1 : 1;
    }
    // Then sort by rating (highest first)
    const ratingA = a.serviceRating ?? 0;
    const ratingB = b.serviceRating ?? 0;
    return ratingB - ratingA;
  });
}

/**
 * Filter rates by route (origin and destination port)
 * Property 14: Route Search Matching
 * 
 * @param rates - Array of shipping rates
 * @param originPort - Origin port code or name
 * @param destinationPort - Destination port code or name
 * @returns Filtered rates matching the route
 */
export function filterRatesByRoute(
  rates: ShippingRate[],
  originPort: string,
  destinationPort: string
): ShippingRate[] {
  const originLower = originPort.toLowerCase();
  const destLower = destinationPort.toLowerCase();
  
  return rates.filter(rate => {
    const matchesOrigin = 
      (rate as any).originCode?.toLowerCase() === originLower ||
      (rate.originPort as any)?.toLowerCase().includes(originLower) ||
      rate.originPortId === originPort;
    
    const matchesDest = 
      (rate as any).destinationCode?.toLowerCase() === destLower ||
      (rate.destinationPort as any)?.toLowerCase().includes(destLower) ||
      rate.destinationPortId === destinationPort;
    
    return matchesOrigin && matchesDest;
  });
}

/**
 * Filter rates by container type
 * Property 12: Filter Accuracy
 * 
 * @param rates - Array of shipping rates
 * @param containerType - Container type to filter by
 * @returns Filtered rates matching the container type
 */
export function filterRatesByContainerType(
  rates: ShippingRate[],
  containerType: string
): ShippingRate[] {
  return rates.filter(rate => rate.containerType === containerType);
}

/**
 * Filter rates by shipping line
 * Property 12: Filter Accuracy
 * 
 * @param rates - Array of shipping rates
 * @param shippingLineId - Shipping line ID to filter by
 * @returns Filtered rates from the specified shipping line
 */
export function filterRatesByShippingLine(
  rates: ShippingRate[],
  shippingLineId: string
): ShippingRate[] {
  return rates.filter(rate => rate.shippingLineId === shippingLineId);
}

/**
 * Filter agents by services offered
 * Property 12: Filter Accuracy
 * 
 * @param agents - Array of port agents
 * @param services - Services to filter by (agent must have ALL specified services)
 * @returns Filtered agents offering all specified services
 */
export function filterAgentsByServices(
  agents: PortAgent[],
  services: PortAgentService[]
): PortAgent[] {
  if (services.length === 0) return agents;
  
  return agents.filter(agent => 
    services.every(service => agent.services.includes(service))
  );
}

/**
 * Filter agents by port
 * Property 14: Route Search Matching
 * 
 * @param agents - Array of port agents
 * @param portCode - Port code to filter by
 * @param portName - Port name to filter by (optional)
 * @returns Filtered agents at the specified port
 */
export function filterAgentsByPort(
  agents: PortAgent[],
  portCode?: string,
  portName?: string
): PortAgent[] {
  return agents.filter(agent => {
    if (portCode && agent.portId === portCode) return true;
    if (portName && agent.portName.toLowerCase().includes(portName.toLowerCase())) return true;
    return false;
  });
}

/**
 * Group agents by country
 * Property 13: Port Agent Grouping by Country
 * 
 * @param agents - Array of port agents
 * @returns Map of country to agents
 */
export function groupAgentsByCountry(agents: PortAgent[]): Map<string, PortAgent[]> {
  const grouped = new Map<string, PortAgent[]>();
  
  for (const agent of agents) {
    const country = agent.portCountry;
    const existing = grouped.get(country) || [];
    existing.push(agent);
    grouped.set(country, existing);
  }
  
  return grouped;
}

/**
 * Search shipping rates with filters
 * Combines Properties 2, 6, 12, 14
 * 
 * @param rates - Array of all shipping rates
 * @param params - Search parameters
 * @returns Filtered and sorted rates
 */
export function searchShippingRates(
  rates: ShippingRate[],
  params: RateSearchParams
): ShippingRate[] {
  let result = filterActiveRates(rates);
  
  // Filter by route
  if (params.originPort && params.destinationPort) {
    result = filterRatesByRoute(result, params.originPort, params.destinationPort);
  }
  
  // Filter by container type
  if (params.containerType) {
    result = filterRatesByContainerType(result, params.containerType);
  }
  
  // Filter by shipping line
  if (params.shippingLineId) {
    result = filterRatesByShippingLine(result, params.shippingLineId);
  }
  
  // Sort by total rate
  return sortRatesByTotal(result);
}

/**
 * Find the best rate for a route
 * Property 8: Best Rate Selection
 * 
 * @param rates - Array of all shipping rates
 * @param originPort - Origin port code or name
 * @param destinationPort - Destination port code or name
 * @param containerType - Container type
 * @returns Best rate and up to 3 alternatives
 */
export function findBestRate(
  rates: ShippingRate[],
  originPort: string,
  destinationPort: string,
  containerType: string
): BestRateResult | null {
  const searchResults = searchShippingRates(rates, {
    originPort,
    destinationPort,
    containerType,
  });
  
  if (searchResults.length === 0) {
    return null;
  }
  
  return {
    rate: searchResults[0], // Lowest rate (already sorted)
    alternatives: searchResults.slice(1, 4), // Next 3 alternatives
  };
}

/**
 * Get agents at a specific port
 * Combines Properties 2, 7, 14
 * 
 * @param agents - Array of all port agents
 * @param portCode - Port code to search
 * @param portName - Port name to search (optional)
 * @returns Filtered and sorted agents
 */
export function getPortAgents(
  agents: PortAgent[],
  portCode?: string,
  portName?: string
): PortAgent[] {
  let result = filterActiveAgents(agents);
  
  if (portCode || portName) {
    result = filterAgentsByPort(result, portCode, portName);
  }
  
  return sortAgentsByPreferredAndRating(result);
}

/**
 * Search agents with multiple filters
 * 
 * @param agents - Array of all port agents
 * @param options - Search options
 * @returns Filtered and sorted agents
 */
export function searchAgents(
  agents: PortAgent[],
  options: {
    portCode?: string;
    portName?: string;
    services?: PortAgentService[];
    country?: string;
    preferredOnly?: boolean;
  }
): PortAgent[] {
  let result = filterActiveAgents(agents);
  
  // Filter by port
  if (options.portCode || options.portName) {
    result = filterAgentsByPort(result, options.portCode, options.portName);
  }
  
  // Filter by services
  if (options.services && options.services.length > 0) {
    result = filterAgentsByServices(result, options.services);
  }
  
  // Filter by country
  if (options.country) {
    result = result.filter(a => 
      a.portCountry.toLowerCase() === options.country!.toLowerCase()
    );
  }
  
  // Filter by preferred
  if (options.preferredOnly) {
    result = result.filter(a => a.isPreferred);
  }
  
  return sortAgentsByPreferredAndRating(result);
}
