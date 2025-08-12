import {ResponseWithSuccessBoolean} from "@/types/easebuzz/index.js";

export interface PanValidationData {
  id: string;
  status: 'success' | 'failure';
  service_charge: number;
  gst_amount: number;
  service_charge_with_gst: number;
  unique_request_number: string;
  pan_number: string;
  dob: string;
  created_at: string;
  is_valid: boolean;
  name: string;
  father_name: string;
  failure_reason?: string;
}

export interface SuccessPanValidation extends PanValidationData {
  status: 'success';
  is_valid: true;
  failure_reason?: never;
}

export interface FailurePanValidation extends PanValidationData {
  status: 'success' | 'failure'; // this is easebuzz's response. not the bank's
  is_valid: false;
  failure_reason: string;
}

export interface PanValidationResponse extends ResponseWithSuccessBoolean {
  data: SuccessPanValidation | FailurePanValidation;
}

export interface GSTINValidationSuccessResponse {
    id: string;
    status: 'success';
    service_charge: number;
    gst_amount: number;
    service_charge_with_gst: number;
    unique_request_number: string;
    gstin: string;
    created_at: string;
    is_valid: boolean;
}

export interface GSTINValidationFailureResponse {
  status: 'failure';
  is_valid: false;
  failure_reason: string;
}

export interface GSTINValidResponse extends ResponseWithSuccessBoolean{
  data:  GSTINValidationSuccessResponse | GSTINValidationFailureResponse;
}