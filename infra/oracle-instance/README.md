# Oracle Staging Instance

Creates a minimal Oracle Cloud VM (Ubuntu 24.04 ARM, VM.Standard.A1.Flex) for Hades staging.

**This is infrastructure only.** No Hades or Hermes code is deployed.

## Current status

- **Networking (VCN, subnet, IGW, route table, security list):** ✅ Created
- **Compute instance:** ❌ Blocked — `VM.Standard.A1.Flex` is out of capacity in all three
  availability domains in `us-ashburn-1`. This is common with Oracle's free ARM tier.
  Capacity fluctuates — try again later (early morning US hours often work).
- **Only A1.Flex / free tier is approved.** Paid shapes (E4.Flex, etc.) are not approved.

## Retry script

```powershell
.\retry-a1-apply.ps1
```

To retry every 60 seconds until capacity opens:

```powershell
.\retry-a1-apply.ps1 -Loop
```

Press `Ctrl+C` to stop looping.

## Prerequisites

- [OCI CLI](https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm) installed and configured (`oci setup config`)
- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- An SSH key pair for the instance

## Variables

Create a `terraform.tfvars` file (never commit it):

```hcl
compartment_ocid      = "ocid1.compartment.oc1..aaaaaa..."
availability_domain   = "Uocm:US-ASHBURN-AD-1"
ssh_public_key_path   = "~/.ssh/id_rsa.pub"
allowed_ssh_cidr      = "0.0.0.0/0"
# optional overrides:
# instance_name          = "hades-staging"
# shape                  = "VM.Standard.A1.Flex"
# ocpus                  = 2
# memory_in_gbs          = 12
# boot_volume_size_in_gbs = 80
```

### Finding a compartment OCID

```bash
oci iam compartment list --compartment-id-in-subtree true --all --output table
```

Copy the `id` column for your target compartment.

### Finding an availability domain

```bash
oci iam availability-domain list --region us-ashburn-1 --output table
```

Pick one (e.g. `Uocm:US-ASHBURN-AD-1`).

### Finding an Ubuntu 24.04 ARM image OCID (if the data source fails)

```bash
oci compute image list \
  --compartment-id <TENANCY_OCID> \
  --operating-system "Canonical Ubuntu" \
  --operating-system-version "24.04 Minimal aarch64" \
  --region us-ashburn-1 \
  --all --output table \
  --query 'data[0]."id"'
```

Then set `image_ocid` in your `terraform.tfvars` to override the data source.

## Commands

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=tfplan
terraform show tfplan          # review
terraform apply tfplan         # deploy
terraform destroy              # tear down
```

## SSH access

```bash
ssh -i ~/.ssh/oracle_hades_ed25519 ubuntu@<public-ip>
```

Or use the `ssh_command` output after apply:

```bash
terraform output ssh_command
```
