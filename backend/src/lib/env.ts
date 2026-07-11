/** Typed access to Lambda environment variables. Fails fast on missing config. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

export const AWS_REGION = optionalEnv("AWS_REGION", "ap-southeast-1");
