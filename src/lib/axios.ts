import {Axios} from 'axios';


export function easeBuzzAxios() {

  // if (!process.env.EASEBUZZ_BASE_URL) {
  //   throw new Error("Easebuzz base URL is missing in env environment");
  // }
  //
  // if (!process.env.EASEBUZZ_MERCHANT_KEY) {
  //   throw new Error("Easebuzz merchant key is missing in env environment");
  // }


  return new Axios({
    baseURL: process.env.EASEBUZZ_BASE_URL,
    // headers: {
    //   "X-EB-MERCHANT-KEY": process.env.EASEBUZZ_MERCHANT_KEY,
    //   "X-EB-SUB-MERCHANT-ID": process.env.EASEBUZZ_SUB_MERCHANT_KEY, // can be undefined
    // }
  })

}

