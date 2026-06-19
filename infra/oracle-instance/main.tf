terraform {
  required_version = ">= 1.5"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }
}

provider "oci" {
  region = var.region
}

# ---------------------------------------------------------------------------
# Image lookup — latest Canonical Ubuntu 24.04 Minimal aarch64
# ---------------------------------------------------------------------------
data "oci_core_images" "ubuntu_arm" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "24.04 Minimal aarch64"
  shape                    = var.shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

data "oci_core_images" "ubuntu_amd" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "24.04"
  shape                    = var.shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

locals {
  is_flex = length(regexall("Flex$", var.shape)) > 0
  image_ocid = var.image_ocid != "" ? var.image_ocid : (
    length(data.oci_core_images.ubuntu_arm.images) > 0
    ? data.oci_core_images.ubuntu_arm.images[0].id
    : try(data.oci_core_images.ubuntu_amd.images[0].id, null)
  )
}

# ---------------------------------------------------------------------------
# Networking
# ---------------------------------------------------------------------------
resource "oci_core_vcn" "this" {
  compartment_id = var.compartment_ocid
  display_name   = "${var.instance_name}-vcn"
  cidr_blocks    = ["10.0.0.0/16"]
  dns_label      = "hades"
}

resource "oci_core_internet_gateway" "this" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.instance_name}-igw"
}

resource "oci_core_route_table" "this" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.instance_name}-rt"

  route_rules {
    network_entity_id = oci_core_internet_gateway.this.id
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
  }
}

resource "oci_core_subnet" "this" {
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.this.id
  display_name      = "${var.instance_name}-subnet"
  cidr_block        = "10.0.1.0/24"
  route_table_id    = oci_core_route_table.this.id
  dns_label         = "hadespub"
  security_list_ids = [oci_core_security_list.this.id]
}

# ---------------------------------------------------------------------------
# Security list
# ---------------------------------------------------------------------------
resource "oci_core_security_list" "this" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.instance_name}-sl"

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  ingress_security_rules {
    protocol    = "6"
    source      = var.allowed_ssh_cidr
    description = "SSH from allowed CIDR"

    tcp_options {
      min = 22
      max = 22
    }
  }

  # ICMP — ping from anywhere
  ingress_security_rules {
    protocol    = "1"
    source      = "0.0.0.0/0"
    description = "ICMP echo request (ping)"

    icmp_options {
      type = 8
      code = 0
    }
  }

  # ICMP — MTU path discovery within VCN
  ingress_security_rules {
    protocol    = "1"
    source      = "10.0.0.0/16"
    description = "ICMP fragmentation-needed"

    icmp_options {
      type = 3
      code = 4
    }
  }
}

# ---------------------------------------------------------------------------
# Compute instance
# ---------------------------------------------------------------------------
resource "oci_core_instance" "this" {
  compartment_id      = var.compartment_ocid
  availability_domain = var.availability_domain
  display_name        = var.instance_name
  shape               = var.shape

  dynamic "shape_config" {
    for_each = local.is_flex ? [1] : []
    content {
      ocpus         = var.ocpus
      memory_in_gbs = var.memory_in_gbs
    }
  }

  source_details {
    source_type             = "image"
    source_id               = local.image_ocid
    boot_volume_size_in_gbs = local.is_flex ? var.boot_volume_size_in_gbs : null
  }

  create_vnic_details {
    assign_public_ip = true
    subnet_id        = oci_core_subnet.this.id
    display_name     = "${var.instance_name}-vnic"
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data           = base64encode(local.cloud_init)
  }

  preserve_boot_volume = false
}

# ---------------------------------------------------------------------------
# Cloud-init — minimal bootstrap
# ---------------------------------------------------------------------------
locals {
  cloud_init = <<-EOF
    #cloud-config
    package_update: true
    packages:
      - curl
      - git
      - build-essential
    write_files:
      - path: /home/ubuntu/oracle-instance-ready.txt
        content: |
          Oracle staging instance created.
          Instance: ${var.instance_name}
          Created by Terraform.
          No application installed yet.
        owner: ubuntu:ubuntu
        permissions: '0644'
    EOF
}
