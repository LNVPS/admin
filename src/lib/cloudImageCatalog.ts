import { ApiOsDistribution } from "./api";

/**
 * A standard, well-known cloud image that can be added with one click.
 * `release_date` is omitted for rolling releases (defaults to today when applied).
 */
export interface StandardCloudImage {
  distribution: ApiOsDistribution;
  flavour: string;
  version: string;
  url: string;
  default_username: string;
  release_date?: string; // ISO date (YYYY-MM-DD)
  sha2_url?: string;
  note?: string;
}

export const DISTRIBUTION_LABELS: Record<ApiOsDistribution, string> = {
  [ApiOsDistribution.UBUNTU]: "Ubuntu",
  [ApiOsDistribution.DEBIAN]: "Debian",
  [ApiOsDistribution.CENTOS]: "CentOS",
  [ApiOsDistribution.FEDORA]: "Fedora",
  [ApiOsDistribution.FREEBSD]: "FreeBSD",
  [ApiOsDistribution.OPENSUSE]: "openSUSE",
  [ApiOsDistribution.ARCHLINUX]: "Arch Linux",
  [ApiOsDistribution.REDHAT_ENTERPRISE]: "Red Hat Enterprise",
  [ApiOsDistribution.ALMALINUX]: "AlmaLinux",
  [ApiOsDistribution.ROCKYLINUX]: "Rocky Linux",
  [ApiOsDistribution.ALPINE]: "Alpine",
  [ApiOsDistribution.NIXOS]: "NixOS",
  [ApiOsDistribution.OPENBSD]: "OpenBSD",
  [ApiOsDistribution.NETBSD]: "NetBSD",
  [ApiOsDistribution.GENTOO]: "Gentoo",
  [ApiOsDistribution.VOIDLINUX]: "Void Linux",
};

/**
 * Curated list of official / de-facto standard cloud-init images (x86_64).
 * URLs prefer stable "latest" symlinks where the distro provides them.
 */
export const STANDARD_CLOUD_IMAGES: StandardCloudImage[] = [
  // Ubuntu
  {
    distribution: ApiOsDistribution.UBUNTU,
    flavour: "server",
    version: "22.04",
    url: "https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img",
    sha2_url: "https://cloud-images.ubuntu.com/jammy/current/SHA256SUMS",
    default_username: "ubuntu",
    release_date: "2022-04-21",
  },
  {
    distribution: ApiOsDistribution.UBUNTU,
    flavour: "server",
    version: "24.04",
    url: "https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img",
    sha2_url: "https://cloud-images.ubuntu.com/noble/current/SHA256SUMS",
    default_username: "ubuntu",
    release_date: "2024-04-25",
  },
  {
    distribution: ApiOsDistribution.UBUNTU,
    flavour: "server",
    version: "26.04",
    url: "https://cloud-images.ubuntu.com/resolute/current/resolute-server-cloudimg-amd64.img",
    sha2_url: "https://cloud-images.ubuntu.com/resolute/current/SHA256SUMS",
    default_username: "ubuntu",
    release_date: "2026-04-23",
  },
  // Debian
  {
    distribution: ApiOsDistribution.DEBIAN,
    flavour: "server",
    version: "12",
    url: "https://cloud.debian.org/images/cloud/bookworm/latest/debian-12-generic-amd64.qcow2",
    sha2_url: "https://cloud.debian.org/images/cloud/bookworm/latest/SHA512SUMS",
    default_username: "debian",
    release_date: "2023-06-10",
  },
  {
    distribution: ApiOsDistribution.DEBIAN,
    flavour: "server",
    version: "13",
    url: "https://cloud.debian.org/images/cloud/trixie/latest/debian-13-generic-amd64.qcow2",
    sha2_url: "https://cloud.debian.org/images/cloud/trixie/latest/SHA512SUMS",
    default_username: "debian",
    release_date: "2025-08-09",
  },
  // Fedora
  {
    distribution: ApiOsDistribution.FEDORA,
    flavour: "server",
    version: "44",
    url: "https://download.fedoraproject.org/pub/fedora/linux/releases/44/Cloud/x86_64/images/Fedora-Cloud-Base-Generic-44-1.7.x86_64.qcow2",
    sha2_url:
      "https://download.fedoraproject.org/pub/fedora/linux/releases/44/Cloud/x86_64/images/Fedora-Cloud-44-1.7-x86_64-CHECKSUM",
    default_username: "fedora",
    release_date: "2026-04-28",
  },
  // CentOS Stream
  {
    distribution: ApiOsDistribution.CENTOS,
    flavour: "stream",
    version: "9",
    url: "https://cloud.centos.org/centos/9-stream/x86_64/images/CentOS-Stream-GenericCloud-9-latest.x86_64.qcow2",
    sha2_url:
      "https://cloud.centos.org/centos/9-stream/x86_64/images/CentOS-Stream-GenericCloud-9-latest.x86_64.qcow2.SHA256SUM",
    default_username: "cloud-user",
    release_date: "2021-12-03",
  },
  {
    distribution: ApiOsDistribution.CENTOS,
    flavour: "stream",
    version: "10",
    url: "https://cloud.centos.org/centos/10-stream/x86_64/images/CentOS-Stream-GenericCloud-10-latest.x86_64.qcow2",
    sha2_url:
      "https://cloud.centos.org/centos/10-stream/x86_64/images/CentOS-Stream-GenericCloud-10-latest.x86_64.qcow2.SHA256SUM",
    default_username: "cloud-user",
    release_date: "2024-12-12",
  },
  // AlmaLinux
  {
    distribution: ApiOsDistribution.ALMALINUX,
    flavour: "server",
    version: "9",
    url: "https://repo.almalinux.org/almalinux/9/cloud/x86_64/images/AlmaLinux-9-GenericCloud-latest.x86_64.qcow2",
    sha2_url: "https://repo.almalinux.org/almalinux/9/cloud/x86_64/images/CHECKSUM",
    default_username: "almalinux",
    release_date: "2022-05-26",
  },
  {
    distribution: ApiOsDistribution.ALMALINUX,
    flavour: "server",
    version: "10",
    url: "https://repo.almalinux.org/almalinux/10/cloud/x86_64/images/AlmaLinux-10-GenericCloud-latest.x86_64.qcow2",
    sha2_url: "https://repo.almalinux.org/almalinux/10/cloud/x86_64/images/CHECKSUM",
    default_username: "almalinux",
    release_date: "2025-05-27",
  },
  // Rocky Linux
  {
    distribution: ApiOsDistribution.ROCKYLINUX,
    flavour: "server",
    version: "9",
    url: "https://dl.rockylinux.org/pub/rocky/9/images/x86_64/Rocky-9-GenericCloud-Base.latest.x86_64.qcow2",
    sha2_url:
      "https://dl.rockylinux.org/pub/rocky/9/images/x86_64/Rocky-9-GenericCloud-Base.latest.x86_64.qcow2.CHECKSUM",
    default_username: "rocky",
    release_date: "2022-07-14",
  },
  {
    distribution: ApiOsDistribution.ROCKYLINUX,
    flavour: "server",
    version: "10",
    url: "https://dl.rockylinux.org/pub/rocky/10/images/x86_64/Rocky-10-GenericCloud-Base.latest.x86_64.qcow2",
    sha2_url:
      "https://dl.rockylinux.org/pub/rocky/10/images/x86_64/Rocky-10-GenericCloud-Base.latest.x86_64.qcow2.CHECKSUM",
    default_username: "rocky",
    release_date: "2025-06-04",
  },
  // Alpine
  {
    distribution: ApiOsDistribution.ALPINE,
    flavour: "server",
    version: "3.24",
    url: "https://dl-cdn.alpinelinux.org/alpine/v3.24/releases/cloud/generic_alpine-3.24.1-x86_64-uefi-cloudinit-r0.qcow2",
    sha2_url:
      "https://dl-cdn.alpinelinux.org/alpine/v3.24/releases/cloud/generic_alpine-3.24.1-x86_64-uefi-cloudinit-r0.qcow2.sha512",
    default_username: "alpine",
    release_date: "2026-06-13",
  },
  // openSUSE
  {
    distribution: ApiOsDistribution.OPENSUSE,
    flavour: "leap",
    version: "15.6",
    url: "https://download.opensuse.org/distribution/leap/15.6/appliances/openSUSE-Leap-15.6-Minimal-VM.x86_64-Cloud.qcow2",
    sha2_url:
      "https://download.opensuse.org/distribution/leap/15.6/appliances/openSUSE-Leap-15.6-Minimal-VM.x86_64-Cloud.qcow2.sha256",
    default_username: "opensuse",
    release_date: "2024-06-12",
  },
  // Arch Linux (rolling - "latest" symlink is refreshed regularly)
  {
    distribution: ApiOsDistribution.ARCHLINUX,
    flavour: "server",
    version: "latest",
    url: "https://geo.mirror.pkgbuild.com/images/latest/Arch-Linux-x86_64-cloudimg.qcow2",
    default_username: "arch",
    note: "Rolling release",
  },
  // FreeBSD (official cloud-init images, hybrid BIOS+UEFI, xz-compressed qcow2)
  {
    distribution: ApiOsDistribution.FREEBSD,
    flavour: "ufs",
    version: "15.0",
    url: "https://download.freebsd.org/releases/VM-IMAGES/15.0-RELEASE/amd64/Latest/FreeBSD-15.0-RELEASE-amd64-BASIC-CLOUDINIT-ufs.qcow2.xz",
    sha2_url: "https://download.freebsd.org/releases/VM-IMAGES/15.0-RELEASE/amd64/Latest/CHECKSUM.SHA256",
    default_username: "freebsd",
    release_date: "2025-12-02",
    note: "Official image (xz-compressed)",
  },
  {
    distribution: ApiOsDistribution.FREEBSD,
    flavour: "ufs",
    version: "14.3",
    url: "https://download.freebsd.org/releases/VM-IMAGES/14.3-RELEASE/amd64/Latest/FreeBSD-14.3-RELEASE-amd64-BASIC-CLOUDINIT-ufs.qcow2.xz",
    sha2_url: "https://download.freebsd.org/releases/VM-IMAGES/14.3-RELEASE/amd64/Latest/CHECKSUM.SHA256",
    default_username: "freebsd",
    release_date: "2025-06-10",
    note: "Official image (xz-compressed)",
  },
  // OpenBSD (unofficial cloud-init build)
  {
    distribution: ApiOsDistribution.OPENBSD,
    flavour: "ufs",
    version: "7.8",
    url: "https://github.com/hcartiaux/openbsd-cloud-image/releases/download/v7.8_2025-10-22-09-25/openbsd-min.qcow2",
    default_username: "openbsd",
    release_date: "2025-10-22",
    note: "Unofficial build (bsd-cloud-image.org)",
  },
  // NetBSD (unofficial cloud-init build)
  {
    distribution: ApiOsDistribution.NETBSD,
    flavour: "ufs",
    version: "10.1",
    url: "https://object-storage.public.mtl1.vexxhost.net/swift/v1/1dbafeefbd4f4c80864414a441e72dd2/bsd-cloud-image.org/images/netbsd/10.1/2025-02-15/ufs/netbsd-10.1-2025-02-15.qcow2",
    default_username: "netbsd",
    release_date: "2024-12-16",
    note: "Unofficial build (bsd-cloud-image.org)",
  },
];
