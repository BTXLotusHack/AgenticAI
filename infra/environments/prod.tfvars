environment = "prod"
region      = "ap-southeast-1"

maps_trace_url = "https://maps.tasco.example.com/trace_attributes"
# Provide via TF_VAR_maps_api_key in CI rather than committing a secret.
maps_api_key = ""

kinesis_on_demand = true
enable_push       = true
