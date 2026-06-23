// Cross-platform `k8s-up`: create a kind cluster, install ingress-nginx, build
// and load the app images, then deploy overlays/local and wait for rollouts.
// Works on Windows/macOS/Linux (requires docker, kind, kubectl on PATH).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLUSTER = 'linklytics';
const INGRESS_MANIFEST =
  'https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.15.1/deploy/static/provider/kind/deploy.yaml';

function run(cmd, args, opts = {}) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { stdio: 'inherit', cwd: ROOT, shell: false, ...opts });
}

function clusterExists() {
  try {
    return execFileSync('kind', ['get', 'clusters'], { cwd: ROOT })
      .toString()
      .split(/\r?\n/)
      .includes(CLUSTER);
  } catch {
    return false;
  }
}

if (clusterExists()) {
  console.log(`kind cluster "${CLUSTER}" already exists — reusing it.`);
} else {
  run('kind', ['create', 'cluster', '--config', 'deploy/k8s/kind-config.yaml']);
}

console.log('\n== Installing ingress-nginx ==');
run('kubectl', ['apply', '-f', INGRESS_MANIFEST]);
run('kubectl', [
  'wait',
  '--namespace',
  'ingress-nginx',
  '--for=condition=ready',
  'pod',
  '--selector=app.kubernetes.io/component=controller',
  '--timeout=180s',
]);

console.log('\n== Building images ==');
run('docker', ['build', '-f', 'apps/api/Dockerfile', '-t', 'linklytics-api:local', '.']);
// Same-origin client calls via the ingress => empty NEXT_PUBLIC_API_URL.
run('docker', [
  'build',
  '-f',
  'apps/web/Dockerfile',
  '--build-arg',
  'NEXT_PUBLIC_API_URL=',
  '-t',
  'linklytics-web:local',
  '.',
]);

console.log('\n== Loading images into kind ==');
run('kind', ['load', 'docker-image', 'linklytics-api:local', '--name', CLUSTER]);
run('kind', ['load', 'docker-image', 'linklytics-web:local', '--name', CLUSTER]);

const secretEnv = path.join(ROOT, 'deploy/k8s/overlays/local/secret.env');
if (!existsSync(secretEnv)) {
  copyFileSync(path.join(ROOT, 'deploy/k8s/overlays/local/secret.example.env'), secretEnv);
  console.log('Created deploy/k8s/overlays/local/secret.env from the example.');
}

console.log('\n== Deploying overlays/local ==');
run('kubectl', ['apply', '-k', 'deploy/k8s/overlays/local']);

console.log('\n== Waiting for rollouts ==');
run('kubectl', ['-n', CLUSTER, 'rollout', 'status', 'statefulset/postgres', '--timeout=180s']);
run('kubectl', ['-n', CLUSTER, 'rollout', 'status', 'deployment/redis', '--timeout=180s']);
run('kubectl', ['-n', CLUSTER, 'rollout', 'status', 'deployment/api', '--timeout=240s']);
run('kubectl', ['-n', CLUSTER, 'rollout', 'status', 'deployment/web', '--timeout=180s']);

console.log('\nLinklytics is up on kind:');
console.log('  Web:      http://localhost/');
console.log('  API:      http://localhost/api/healthz  (probes use /healthz, /readyz)');
console.log('  Redirect: http://localhost/r/<slug>');
