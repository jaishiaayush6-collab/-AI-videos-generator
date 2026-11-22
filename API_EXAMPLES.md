# API examples

## Health

```bash
curl http://localhost:3000/api/health
```

## Text-to-story

```bash
curl -X POST http://localhost:3000/api/generate \
  -F "mode=text-to-story" \
  -F "prompt=Write a short uplifting story about friendship in Nepal"
```

## Image-to-story

```bash
curl -X POST http://localhost:3000/api/generate \
  -F "mode=image-to-story" \
  -F "prompt=Write a hopeful story inspired by this picture" \
  -F "image=@./sample.jpg"
```

## Check a Replicate job

```bash
curl http://localhost:3000/api/jobs/REPLICATE_PREDICTION_ID
```
