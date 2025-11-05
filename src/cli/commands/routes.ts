import { loadConfig } from "../../server/config.js";
import chalk from "chalk";

interface RoutesOptions {
  config?: string;
}

export const routesCommand = async (options: RoutesOptions) => {
  try {
    const config = await loadConfig(options.config || "./x402test.config.js");
    const routeConfig = config.routes;

    console.log(chalk.cyan("Configured Routes:\n"));
    for (const [path, route] of Object.entries(routeConfig)) {
      console.log(chalk.green(`${path}: ${route.description || "N/A"}`));
      console.log(chalk.yellow(`  Price: ${route.price} USDC`));
      console.log(
        chalk.blue(`  Response: ${JSON.stringify(route.response, null, 2)}`)
      );
      console.log(chalk.gray(`  Status: ${route.status || 200}`));
      console.log("\n");
    }
  } catch (err) {
    console.error(
      chalk.red(
        `Failed to load config: ${
          err instanceof Error ? err.message : String(err)
        }`
      )
    );
    process.exit(1);
  }
};
