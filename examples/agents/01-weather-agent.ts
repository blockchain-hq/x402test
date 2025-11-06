/**
 * Example 1: Weather Agent
 *
 * An AI agent that autonomously purchases weather data
 * using x402 micropayments.
 *
 * Run: npx tsx examples/agents/01-weather-agent.ts
 */

import { x402 } from "../../src/lib/index.js";

class WeatherAgent {
  private budget: number;
  private spent: number = 0;

  constructor(budget: number) {
    this.budget = budget;
    console.log(`✔ Weather Agent initialized with budget: ${budget} USDC`);
  }

  async getWeather(city: string): Promise<any> {
    console.log(`\n✔ Agent: Fetching weather for ${city}...`);

    // Check budget before making payment
    const costPerRequest = 0.01;
    if (this.spent + costPerRequest > this.budget) {
      throw new Error("✘ Budget exceeded! Cannot make request.");
    }

    try {
      const response = await x402("http://localhost:4402/api/data")
        .withPayment({ amount: costPerRequest.toString() })
        .expectStatus(200)
        .execute();

      this.spent += costPerRequest;

      console.log(`✔ Agent: Weather data acquired`);
      console.log(`   Cost: ${costPerRequest} USDC`);
      console.log(
        `   Budget remaining: ${(this.budget - this.spent).toFixed(2)} USDC`
      );

      return response.body;
    } catch (error) {
      console.error(`✘ Agent: Failed to get weather data`);
      throw error;
    }
  }

  async analyzeWeekTrends(cities: string[]): Promise<void> {
    console.log(
      `\n✔ Agent: Analyzing weather trends for ${cities.length} cities...`
    );

    const results: { city: string; data: any }[] = [];
    for (const city of cities) {
      try {
        const data = await this.getWeather(city);
        results.push({ city, data });
      } catch (error) {
        console.log(`   Skipping ${city} due to error`);
      }
    }

    console.log(`\n✔ Agent: Analysis complete`);
    console.log(`   Cities analyzed: ${results.length}`);
    console.log(`   Total spent: ${this.spent.toFixed(2)} USDC`);
    console.log(
      `   Average cost per city: ${(this.spent / results.length).toFixed(
        4
      )} USDC`
    );
  }

  reportBudget() {
    console.log(`\n✔ Budget Report:`);
    console.log(`   Initial: ${this.budget} USDC`);
    console.log(`   Spent: ${this.spent.toFixed(2)} USDC`);
    console.log(`   Remaining: ${(this.budget - this.spent).toFixed(2)} USDC`);
    console.log(
      `   Utilization: ${((this.spent / this.budget) * 100).toFixed(1)}%`
    );
  }
}

const example = async (): Promise<void> => {
  console.log("✔ Example 1: Autonomous Weather Agent\n");

  const agent = new WeatherAgent(0.5); // 50 cents budget

  await agent.analyzeWeekTrends([
    "San Francisco",
    "New York",
    "London",
    "Tokyo",
    "Sydney",
  ]);

  agent.reportBudget();
};

example();
