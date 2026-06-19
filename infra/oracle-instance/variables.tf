variable "compartment_ocid" {
  description = "OCID of the compartment to create resources in"
  type        = string
}

variable "region" {
  description = "OCI region"
  type        = string
  default     = "us-ashburn-1"
}

variable "availability_domain" {
  description = "Availability domain for the instance"
  type        = string
}

variable "ssh_public_key_path" {
  description = "Path to the SSH public key file (~ expansion allowed)"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed to SSH into the instance"
  type        = string
}

variable "instance_name" {
  description = "Display name for the compute instance"
  type        = string
  default     = "hades-staging"
}

variable "shape" {
  description = "Compute shape"
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "ocpus" {
  description = "Number of OCPUs (A1.Flex ARM cores)"
  type        = number
  default     = 2
}

variable "memory_in_gbs" {
  description = "Memory in GB"
  type        = number
  default     = 12
}

variable "boot_volume_size_in_gbs" {
  description = "Boot volume size in GB"
  type        = number
  default     = 80
}

variable "image_ocid" {
  description = "Override for the Ubuntu 24.04 ARM image OCID. If empty, uses the data source."
  type        = string
  default     = ""
}
