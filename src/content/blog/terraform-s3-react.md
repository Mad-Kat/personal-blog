---
title: "Setup React on S3 with Terraform"
pubDate: "2022-07-01T17:00+02:00"
description: "Small tutorial on how to host a react application on S3 with terraform."
seoTitle: "How to host a react application on OBS / S3 with terraform"
---

Recently, I had the chance to develop a new single-page application for an internal tool at my company. We were in the middle of migrating from AWS to Open Telekom Cloud (OTC), and I needed to figure out how to host our shiny new app.

I thought, "Hey, why not use the Object Storage Service (OBS) - OTC's equivalent of S3?" So, I set out to create a deployment process using Terraform, GitHub workflows, and OTC. Little did I know, I was in for a surprise!

Here's where things got interesting: I discovered (a bit too late, I might add) that HTTPS only worked for the provided domain, not a custom one. Oops! Since I had my heart set on using a custom domain, I ended up switching to our usual deployment method - creating a Kubernetes service with an Nginx image to host the frontend files.

But fear not! I still want to share how I set up the React application on OBS/S3 because it's a handy skill to have in your developer toolkit.

## Step 1: Create a Public S3 Bucket

First things first, we need to create a public S3 bucket. Here's how you can do it with Terraform:

```hcl 
resource "opentelekomcloud_s3_bucket" "frontend_bucket" {
  bucket = "frontend-app"
  acl    = "public-read"
}
```

## Step 2: Configure the Bucket

Next, we'll attach a policy to allow public access to the bucket contents. We'll also set up the bucket to serve our index.html as the root and specify an error page:

```hcl
resource "opentelekomcloud_s3_bucket" "frontend_bucket" {
  bucket = local.bucket_name
  acl    = "public-read"
  website {
    index_document = "index.html"
    error_document = "error.html"
  }
  policy = <<POLICY
  {
    "Version": "2008-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal":{
                "AWS":["*"]
            },
            "Action": [
                "s3:GetObject"
            ],
            "Resource": [
                "arn:aws:s3:::${local.bucket_name}/*"
            ]
        }
    ]
}
POLICY
}
```

## Step 3: Set Up the Build Process

For this step, we'll use the standard create-react-app (CRA) build process. It's straightforward and gives us a folder with all the necessary files to host our app.

## Step 4: Upload Files to the Bucket

Now for the fun part! We need to upload our build output to the bucket and set the correct MIME types. Here's how we can do it with Terraform:

```hcl
resource "opentelekomcloud_s3_bucket_object" "frontend_object" {
  for_each = fileset("./build", "**")
  key      = each.value
  source   = "${path.module}/build/${each.value}"
  bucket   = opentelekomcloud_s3_bucket.frontend_bucket.bucket
}
```

## The Secret Sauce: MIME Type Mapping

To make sure our files are served with the correct MIME types, we'll create a map of file extensions to MIME types. Here's a simple version:

```hcl
locals {
	mime_map = {
		".html" = "text/html"
		".css" = "text/css"
		".js" = "application/javascript"
	}
}
```

But this only maps three different types of files and there could be a lot more (images, illustrations, videos...).
So in order to map most of the common file types we can use a [file](https://www.google.com) that shows the mapping per line according to the [iana](https://www.iana.org/assignments/media-types/media-types.xhtml) and generate a map out of it with the help of terraform.

```hcl
locals {
  raw_content = file("./mime.types")
  raw_lines = [
    for rawl in split("\n", local.raw_content) :
    trimspace(replace(rawl, "/(#.*)/", ""))
  ]
  lines = [
    for l in local.raw_lines : split(" ", replace(l, "/\\s+/", " "))
    if l != ""
  ]
  pairs = flatten([
    for l in local.lines : [
      for suf in slice(l, 1, length(l)) : {
        content_type = l[0]
        suffix       = ".${suf}"
      }
    ]
  ])
  # There can potentially be more than one entry for the same
  # suffix in a mime.types file, so we'll gather them all up
  # here and then just discard all but the first one when
  # we produce our result below, mimicking a behavior of
  # scanning through the mime.types file until you find the
  # first mention of a particular suffix.
  mime_map = tomap({
    for pair in local.pairs : pair.suffix => pair.content_type...
  })
}
```

With this the setup is complete and we have a public accessible bucket with all built files with the correct MIME-types and cache handling. The only problem that remains is that we can’t host the bucket on a different domain with a working SSL setup. At least not on OTC.

<!-- [^1]: [1] [https://www.terraform.io/language/functions/fileset](https://www.terraform.io/language/functions/fileset) -->