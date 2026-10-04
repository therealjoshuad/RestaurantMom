import { Mastra } from '@mastra/core'
import { restaurantMom } from './agents/restaurant-mom'

export const mastra = new Mastra({
  agents: { restaurantMom },
})
