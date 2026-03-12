output "photos_bucket_name" {
  value = aws_s3_bucket.photos.id
}

output "photos_bucket_arn" {
  value = aws_s3_bucket.photos.arn
}

output "voice_bucket_name" {
  value = aws_s3_bucket.voice.id
}

output "assets_bucket_name" {
  value = aws_s3_bucket.assets.id
}

output "assets_bucket_arn" {
  value = aws_s3_bucket.assets.arn
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.photos.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.photos.id
}

output "assets_cloudfront_domain_name" {
  value = aws_cloudfront_distribution.assets.domain_name
}

output "assets_cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.assets.id
}
