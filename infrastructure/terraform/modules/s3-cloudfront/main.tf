# ─── S3 + CloudFront Module ────────────────────────────────
# S3 buckets for photo/media storage with CloudFront CDN.

# ─── Photos Bucket ─────────────────────────────────────────
resource "aws_s3_bucket" "photos" {
  bucket = "${var.project}-photos-${var.environment}"

  tags = {
    Name        = "${var.project}-photos-${var.environment}"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_s3_bucket_versioning" "photos" {
  bucket = aws_s3_bucket.photos.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "photos" {
  bucket = aws_s3_bucket.photos.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT"]
    allowed_origins = ["*"]
    max_age_seconds = 3600
  }
}

# ─── Photos Lifecycle Rules ─────────────────────────────────
resource "aws_s3_bucket_lifecycle_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  rule {
    id     = "move-old-photos-to-ia"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# ─── Voice Notes Bucket ───────────────────────────────────
resource "aws_s3_bucket" "voice" {
  bucket = "${var.project}-voice-${var.environment}"

  tags = {
    Name        = "${var.project}-voice-${var.environment}"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "voice" {
  bucket = aws_s3_bucket.voice.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "voice" {
  bucket = aws_s3_bucket.voice.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "voice" {
  bucket = aws_s3_bucket.voice.id

  rule {
    id     = "move-old-voice-to-ia"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# ─── App Assets Bucket ──────────────────────────────────────
resource "aws_s3_bucket" "assets" {
  bucket = "${var.project}-assets-${var.environment}"

  tags = {
    Name        = "${var.project}-assets-${var.environment}"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = ["*"]
    max_age_seconds = 86400
  }
}

# ─── CloudFront OAC ───────────────────────────────────────
resource "aws_cloudfront_origin_access_control" "photos" {
  name                              = "${var.project}-${var.environment}-photos-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_control" "assets" {
  name                              = "${var.project}-${var.environment}-assets-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ─── CloudFront Distribution (Photos) ──────────────────────
resource "aws_cloudfront_distribution" "photos" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = ""
  comment             = "${var.project} ${var.environment} photo CDN"
  price_class         = var.environment == "production" ? "PriceClass_All" : "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.photos.bucket_regional_domain_name
    origin_id                = "photos-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.photos.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "photos-s3"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.cdn_certificate_arn == "" ? true : false
    acm_certificate_arn            = var.cdn_certificate_arn != "" ? var.cdn_certificate_arn : null
    ssl_support_method             = var.cdn_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version       = var.cdn_certificate_arn != "" ? "TLSv1.2_2021" : null
  }

  aliases = var.cdn_domain_name != "" ? ["cdn.${var.cdn_domain_name}"] : []

  tags = {
    Name        = "${var.project}-${var.environment}-cdn"
    Environment = var.environment
    Project     = var.project
  }
}

# ─── CloudFront Distribution (Assets) ──────────────────────
resource "aws_cloudfront_distribution" "assets" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = ""
  comment             = "${var.project} ${var.environment} app assets CDN"
  price_class         = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id                = "assets-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.assets.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "assets-s3"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 604800    # 7 days
    max_ttl                = 31536000  # 1 year
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "${var.project}-${var.environment}-assets-cdn"
    Environment = var.environment
    Project     = var.project
  }
}

# ─── S3 Bucket Policies for CloudFront ──────────────────────
data "aws_caller_identity" "current" {}

resource "aws_s3_bucket_policy" "photos" {
  bucket = aws_s3_bucket.photos.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.photos.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.photos.arn
        }
      }
    }]
  })
}

resource "aws_s3_bucket_policy" "assets" {
  bucket = aws_s3_bucket.assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.assets.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.assets.arn
        }
      }
    }]
  })
}
