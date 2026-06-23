import { IsISO8601, IsOptional, IsUrl, Matches } from 'class-validator';

export class CreateLinkDto {
  @IsUrl(
    { require_protocol: true, protocols: ['http', 'https'] },
    { message: 'originalUrl must be a valid http(s) URL' },
  )
  originalUrl!: string;

  // Optional branded slug. Auto-generated (collision-safe) when omitted.
  @IsOptional()
  @Matches(/^[a-zA-Z0-9_-]{3,32}$/, {
    message: 'customSlug must be 3-32 characters: letters, digits, - or _',
  })
  customSlug?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
