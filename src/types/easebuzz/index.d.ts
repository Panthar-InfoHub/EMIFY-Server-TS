
export interface ResponseWithSuccessBoolean {
  success: boolean
}

export interface EaseBuzzInvalidTypeErr extends ResponseWithSuccessBoolean {
  success: false,
  message: string,
}

