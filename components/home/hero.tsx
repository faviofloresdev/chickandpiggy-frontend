import { bffApi } from '@/lib/api/bff'
import { CinematicHero } from '@/components/home/cinematic-hero'

export async function Hero() {
  const hero = await bffApi.getLandingHero()

  return <CinematicHero hero={hero} />
}
