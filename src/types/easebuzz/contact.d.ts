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

export interface CreateBeneficiaryResponse extends ResponseWithSuccessBoolean {
  data: {
    "beneficiary": {
      "id": "string",
      "contact": {
        "id": "string",
        "status": "string",
        "created_at": "string",
        "deleted_at": null,
        "name": "string",
        "email": "string",
        "phone": "string",
        "created_by": null
      },
      "created_at": "string",
      "deleted_at": null,
      "beneficiary_type": "string",
      "bank_name": "string",
      "account_name": "string" | null,
      "account_number": "string" | null,
      "account_ifsc": "string" | null,
      "upi_handle": "string" | null,
      "is_active": boolean,
      "is_primary": boolean,
      "created_by": null
    }
  }
}