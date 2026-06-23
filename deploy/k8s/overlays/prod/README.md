# Production overlay (documented placeholder)

This overlay shows how Linklytics would ship to a real cluster. It is **not
deployed** anywhere — the project runs entirely on local `kind` at `$0`.

What it changes vs. `base`:

- **Images** point at `ghcr.io/OWNER/linklytics-{api,web}` (CD pushes these).
  Replace `OWNER` with your GitHub org/user.
- **Replicas** bumped to 3 for api and web.
- **TLS** via cert-manager (`ingress-tls-patch.yaml`) on a real host, with the
  app served at `https://app.linklytics.example`.
- **Cookies** become `Secure` and CORS/redirect base move to HTTPS origins
  (`configmap-patch.yaml`).

Secrets come from your platform's secret manager (sealed-secrets, External
Secrets Operator, cloud KMS, …) — never from a committed file.

Validate the manifests render without deploying:

```bash
cp secret.example.env secret.env   # placeholder values, gitignored
kubectl kustomize deploy/k8s/overlays/prod
```
