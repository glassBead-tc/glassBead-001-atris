// import fetch from 'node-fetch';
// import { sampleSize } from 'lodash';

// const APP_NAME = 'ATRIS';

// export class AudiusServiceSelection {
//   private services: string[] = [];
//   private unhealthy: Set<string> = new Set();
//   private maxConcurrentRequests: number;
//   private requestTimeout: number;

//   constructor(maxConcurrentRequests: number = 6, requestTimeout: number = 30000) {
//     this.maxConcurrentRequests = maxConcurrentRequests;
//     this.requestTimeout = requestTimeout;
//   }

//   async getServices(): Promise<string[]> {
//     try {
//       const response = await fetch('https://api.audius.co');
//       const data = await response.json();
//       if (data.data && Array.isArray(data.data)) {
//         this.services = data.data;
//         return this.services;
//       }
//       throw new Error('Invalid response from Audius API');
//     } catch (error) {
//       console.error('Error fetching Audius services:', error);
//       throw error;
//     }
//   }

//   private filterOutKnownUnhealthy(services: string[]): string[] {
//     return services.filter(s => !this.unhealthy.has(s));
//   }

//   private getSelectionRound(services: string[]): string[] {
//     return sampleSize(services, this.maxConcurrentRequests);
//   }

//   private static getHealthCheckEndpoint(service: string): string {
//     return `${service}/health_check`;
//   }

//   private async isHealthy(service: string): Promise<boolean> {
//     try {
//       const response = await fetch(AudiusServiceSelection.getHealthCheckEndpoint(service), {
//         timeout: this.requestTimeout
//       });
//       return response.status === 200;
//     } catch (error) {
//       return false;
//     }
//   }

//   async select(): Promise<string | null> {
//     if (this.services.length === 0) {
//       await this.getServices();
//     }

//     const filteredServices = this.filterOutKnownUnhealthy(this.services);
//     const round = this.getSelectionRound(filteredServices);

//     for (const service of round) {
//       if (await this.isHealthy(service)) {
//         return service;
//       } else {
//         this.unhealthy.add(service);
//       }
//     }

//     return null;
//   }

//   async makeRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
//     const service = await this.select();
//     if (!service) {
//       throw new Error('No healthy Audius service available');
//     }

//     const queryParams = new URLSearchParams({ ...params, app_name: APP_NAME });
//     const url = `${service}/v1${endpoint}?${queryParams}`;

//     try {
//       const response = await fetch(url, {
//         headers: { 'Accept': 'application/json' }
//       });

//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       return await response.json();
//     } catch (error) {
//       console.error('Error making request to Audius API:', error);
//       throw error;
//     }
//   }
// }
