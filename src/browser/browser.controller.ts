import { Controller, Get } from '@nestjs/common';
import { BrowserService } from './browser.service';

@Controller('browser')
export class BrowserController {
  constructor(private readonly BrowserService: BrowserService) {}

  @Get('login')
  async login() {
    const loggedIn = await this.BrowserService.waitForLogin();
    return loggedIn;
  }
}
