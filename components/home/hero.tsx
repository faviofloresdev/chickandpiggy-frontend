import { CinematicHero } from '@/components/home/cinematic-hero'
import { strapiContentApi } from '@/lib/api/strapi'

export async function Hero() {
  const hero = await strapiContentApi.getLandingHero().then((result) => result.data)

  return <CinematicHero hero={hero} />
}
