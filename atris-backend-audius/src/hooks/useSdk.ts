import { sdk } from '@audius/sdk'

const apiKey = import.meta.env.AUDIUS_API_KEY as string

const instance = sdk({
  apiKey
})

export const useSdk = () => ({ sdk: instance })
