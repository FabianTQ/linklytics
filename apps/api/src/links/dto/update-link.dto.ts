import { IsBoolean, IsISO8601, IsOptional, IsUrl, ValidateIf } from 'class-validator';

export class UpdateLinkDto {
  @IsOptional()
  @IsUrl(
    { require_protocol: true, protocols: ['http', 'https'] },
    { message: 'originalUrl must be a valid http(s) URL' },
  )
  originalUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // `null` clears the expiry; a date string sets it.
  @IsOptional()
  @ValidateIf((o: UpdateLinkDto) => o.expiresAt !== null)
  @IsISO8601()
  expiresAt?: string | null;
}
