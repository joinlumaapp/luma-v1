output "endpoint" {
  value = aws_opensearch_domain.main.endpoint
}

output "domain_name" {
  value = aws_opensearch_domain.main.domain_name
}

output "security_group_id" {
  value = aws_security_group.opensearch.id
}
