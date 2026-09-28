declare module "zipcodes" {
  export function lookup(zip: string | number):
    | { zip: string; latitude: number; longitude: number; city: string; state: string; country: string }
    | undefined;
  export function radius(zip: string | number, miles: number): string[];
  export function distance(zip1: string | number, zip2: string | number): number;
}
