import { Injectable }    from '@angular/core';
import { Headers, Http } from '@angular/http';
import { Router } from '@angular/router';


import 'rxjs/add/operator/toPromise';

import { User } from '../../models/user/user';
import { Organization } from '../../models/organization/organization';

import { AppConfig } from '../../app-config'
@Injectable()
export class UserService {

    headers = new Headers({
        'Content-Type': 'application/json',
    });
    private usersURL = AppConfig.ServiceBase + '/users/';  // URL to users
    private organizationsURL = AppConfig.ServiceBase + '/organizations/';  // URL to users
    private loginURL = AppConfig.ServiceBase + '/oauth/token/';  // URL to web api

    loggedIn    :boolean    = false;
    token       :any        = null;
    tokenExpire :number     = 0;
    user        :User       = null;
    loading     :boolean    = false;
    error       :any        = null;
    success     :boolean    = null;
    organization: Organization;

    constructor(private http: Http, private router: Router) {
        if (localStorage.getItem("token") && null === this.token) {
            this.token = {};
            this.token.access_token = localStorage.getItem("token");
            this.headers = new Headers({
                'Content-Type': 'application/json',
                'Authorization' : 'Bearer ' + this.token.access_token
            });
        }

        if (localStorage.getItem('tokenExpire')) {
            this.tokenExpire = Number(localStorage.getItem('tokenExpire'));
        }

        if (localStorage.getItem('user')) {
            this.user = JSON.parse(localStorage.getItem('user'));

            this.loggedIn = true;
        }

        if (localStorage.getItem('organization')) {
            this.organization = JSON.parse(localStorage.getItem('organization'));
        }

        if (!this.loggedIn) {
            this.router.navigate(["/login"]);
        }

        this.checkToken();
    }

    login(email : string, password : string): void {
        this.clear();

        this.loading = true;

        this.authorize(email, password)
            .then(response => {
                return this.getToken(email, password, response.clientId, response.clientSecret);
            })
            .then(response => {
                return this.getInfo();
            })
            .then(response => {
                this.loggedIn = true;
                this.loading = false;

                this.router.navigate(["/dashboard"]);
            })
            .catch(err => {
                this.error = err.errors;
                this.loading = false;
                this.loggedIn = false;

                this.showError(err);
            });
    }

    getToken(username : string, password : string, clientId : string, clientSecret : string): Promise<any>{
        return this.http.post(this.loginURL, JSON.stringify({ grant_type : "password", username : username, password : password, client_id : clientId, client_secret : clientSecret }), {headers : this.headers})
            .toPromise()
            .then(response => {
                this.loggedIn = true;
                this.token = response.json();

                localStorage.setItem("token", this.token.access_token);
                var now = new Date();
                localStorage.setItem("tokenExpire", String(now.getTime() + (parseInt(this.token.expires_in) * 1000)) );

                this.headers = new Headers({
                    'Content-Type': 'application/json',
                    'Authorization' : 'Bearer ' + this.token.access_token
                });

                return this.token;
            })
            .catch(this.handleError);
    }

    authorize(email : string, password : string): Promise<any>{
        return this.http.post(this.usersURL + "authorize", JSON.stringify({ email : email, password : password }), {headers : this.headers})
            .toPromise()
            .then(response => {
                return response.json().data;
            })
            .catch(this.handleError);
    }

    logout(): void {
        localStorage.clear();
        this.clear();

        this.router.navigate(["/login"]);
    }

    clear(): void {
        this.loggedIn = false;
        this.token = null;
        this.user = null;
        this.loading = false;
        this.error = null;
        this.success = false;
        this.tokenExpire = 0;
    }

    checkToken() : void {
        if (0 !== this.tokenExpire) {
            var now = new Date();

            if (now.getTime() > this.tokenExpire) {
                this.logout();
            }
        }
    }

    clearErrors(): void {
        this.error = null;
        this.success = false;
    }

    getInfo(): Promise<any> {
        return Promise.all([this.getUser(), this.getOrganization()]);
    }

    getUser(): Promise<any> {
        return this.http.get(this.usersURL, { headers: this.headers })
            .toPromise()
            .then(response => {
                this.user = response.json().data;

                localStorage.setItem('user', JSON.stringify(this.user));

                return this.user;
            })
            .catch(this.handleError)
    }

    getOrganization(): Promise<any> {
        return this.http.get(this.organizationsURL, { headers: this.headers })
            .toPromise()
            .then(response => {
                this.organization = response.json().data[0];

                localStorage.setItem('organization', JSON.stringify(this.organization));

                return this.user;
            })
            .catch(this.handleError);
    }

    save(): Promise<any> {
        this.clearErrors();

        this.loading = true;

        return this.http.put(this.usersURL + this.user.id, JSON.stringify(this.user), { headers: this.headers })
            .toPromise()
            .then(response => {
                if (200 === response.json().status) {
                    this.success = true;

                    this.showSuccess("Saved");
                } else {
                    this.error = response.json().errors;


                    this.showError(response.json().errors);
                }

                return this.getInfo();
            })
            .catch(err => {
                this.showError(err);
            });
    }

    private handleError(error: any): Promise<any> {
        if (401 === error.status) {
            return Promise.reject(error._body);
        }

        return Promise.reject((JSON.parse(error._body)));
    }

    private showError(error: any): void {
        this.loading = false;

        var getError = error.json().errors;

        /*
        if ("undefined" !== typeof getError.message && "undefined" !== typeof getError.message.message) {
            this.snackBar.open('Error CODE: ' + getError.code + "! " + getError.message.message, "", {
                duration : 3000,
            });
        } else {
            this.snackBar.open('Error CODE: ' + getError.code + "! " + getError.message, "", {
                duration : 3000,
            });
        }*/
    }

    private showSuccess(message: string) : void {
        this.loading = false;
        /*
        this.snackBar.open(message, "", {
            duration : 3000,
        });*/
    }
}

