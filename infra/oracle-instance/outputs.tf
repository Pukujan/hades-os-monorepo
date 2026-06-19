output "public_ip" {
  description = "Public IPv4 address of the instance"
  value       = oci_core_instance.this.public_ip
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ${var.ssh_public_key_path} ubuntu@${oci_core_instance.this.public_ip}"
}

output "instance_id" {
  description = "OCID of the created instance"
  value       = oci_core_instance.this.id
}

output "subnet_id" {
  description = "OCID of the public subnet"
  value       = oci_core_subnet.this.id
}

output "vcn_id" {
  description = "OCID of the VCN"
  value       = oci_core_vcn.this.id
}
