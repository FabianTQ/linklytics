# Kubernetes metrics scraping

The API exposes Prometheus metrics at `/metrics` on port 3001. Two ways to scrape
them in a cluster:

1. **Annotation-based** — the api pods carry `prometheus.io/scrape: "true"`,
   `prometheus.io/port: "3001"`, `prometheus.io/path: /metrics`. A Prometheus
   configured with `kubernetes_sd_configs` + relabeling will pick them up
   automatically.

2. **Prometheus Operator** — [`servicemonitor.yaml`](servicemonitor.yaml) is a
   `ServiceMonitor` for a cluster running the Operator (e.g.
   [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts)).
   It is **not** part of `overlays/local` because `kind` has no Operator. Apply
   it separately once the Operator is installed:

   ```bash
   kubectl apply -f deploy/k8s/monitoring/servicemonitor.yaml
   ```

If `METRICS_TOKEN` is set on the API, configure the scrape job with a bearer
token accordingly.
