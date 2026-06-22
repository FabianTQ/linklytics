import { IsUrl } from 'class-validator';

export class CreateLinkDto {
  @IsUrl(
    { require_protocol: true, protocols: ['http', 'https'] },
    { message: 'originalUrl must be a valid http(s) URL' },
  )
  originalUrl!: string;
}
