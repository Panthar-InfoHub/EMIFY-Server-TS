

export function getEaseBuzzEnv(prodUrl: string, mockUrl?: string) {

  if (!process.env.EASEBUZZ_API_ENV) {
    throw new Error("EASEBUZZ_API_ENV not set")
  }

  if (process.env.EASEBUZZ_API_ENV != 'production') {
    return new URL(mockUrl ?? prodUrl)
  } else {
    return new URL(prodUrl)
  }

}