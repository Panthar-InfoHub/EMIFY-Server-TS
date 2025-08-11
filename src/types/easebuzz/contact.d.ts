import {ResponseWithSuccessBoolean} from "@/types/easebuzz/index.js";


export interface CreateContact200Response extends ResponseWithSuccessBoolean {
  success: true;
  data: {
    id: string,
    status: "Active" | "Inactive",
    created_at: string,
    deleted_at: string,
    name: string,
    email?: string | null,
    phone?: string| null,
    created_by?: string | null,
  }
}

export interface CreateContactHashErr extends ResponseWithSuccessBoolean {
  success: false,
  status: string,
  message: string,
}

