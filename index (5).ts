openapi: 3.1.0
info:
  # Do not change the title, if the title changes, the import paths will be broken
  title: Api
  version: 0.1.0
  description: API specification
servers:
  - url: /api
    description: Base API path
tags:
  - name: health
    description: Health operations
  - name: anthropic
    description: Anthropic AI chat operations
  - name: tts
    description: Text-to-speech operations
  - name: contacts
    description: Connection request operations
  - name: providers
    description: Provider signup operations
paths:
  /healthz:
    get:
      operationId: healthCheck
      tags: [health]
      summary: Health check
      description: Returns server health status
      responses:
        "200":
          description: Healthy
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/HealthStatus"
  /anthropic/conversations:
    get:
      operationId: listAnthropicConversations
      tags: [anthropic]
      summary: List all conversations
      responses:
        "200":
          description: List of conversations
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/AnthropicConversation"
    post:
      operationId: createAnthropicConversation
      tags: [anthropic]
      summary: Create a new conversation
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/AnthropicConversationInput"
      responses:
        "201":
          description: Created conversation
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AnthropicConversation"
  /anthropic/conversations/{id}:
    get:
      operationId: getAnthropicConversation
      tags: [anthropic]
      summary: Get conversation with messages
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: Conversation with messages
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AnthropicConversationWithMessages"
        "404":
          description: Not found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AnthropicError"
    delete:
      operationId: deleteAnthropicConversation
      tags: [anthropic]
      summary: Delete a conversation
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "204":
          description: Deleted
        "404":
          description: Not found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AnthropicError"
  /anthropic/conversations/{id}/messages:
    get:
      operationId: listAnthropicMessages
      tags: [anthropic]
      summary: List messages in a conversation
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: List of messages
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/AnthropicMessage"
    post:
      operationId: sendAnthropicMessage
      tags: [anthropic]
      summary: Send a message and receive an AI response (SSE stream)
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/AnthropicMessageInput"
      responses:
        "200":
          description: SSE stream of assistant response chunks
          content:
            text/event-stream: {}
  /tts/synthesize:
    post:
      operationId: synthesizeSpeech
      tags: [tts]
      summary: Convert text to speech via ElevenLabs
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/TTSRequest"
      responses:
        "200":
          description: Audio data as base64
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/TTSResponse"
        "500":
          description: TTS error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AnthropicError"
  /sage/chat:
    post:
      operationId: sageChat
      tags: [anthropic]
      summary: Send a message to Sage (non-streaming, simple)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/SageChatInput"
      responses:
        "200":
          description: Sage response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SageChatResult"
  /sage/profile:
    post:
      operationId: generateProfile
      tags: [anthropic]
      summary: Generate a therapy profile from conversation history
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ProfileInput"
      responses:
        "200":
          description: Generated profile
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/TherapyProfile"
  /contacts:
    post:
      operationId: submitContactRequest
      tags: [contacts]
      summary: Submit a connection request to a therapist
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ContactRequestInput"
      responses:
        "201":
          description: Contact request created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ContactRequestResult"
        "400":
          description: Validation error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AnthropicError"
  /providers/apply:
    post:
      operationId: submitProviderApplication
      tags: [providers]
      summary: Submit a provider signup application
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ProviderApplicationInput"
      responses:
        "201":
          description: Application submitted
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ProviderApplicationResult"
        "400":
          description: Validation error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AnthropicError"
components:
  schemas:
    HealthStatus:
      type: object
      properties:
        status:
          type: string
      required:
        - status
    AnthropicConversation:
      type: object
      properties:
        id:
          type: integer
        title:
          type: string
        createdAt:
          type: string
          format: date-time
      required:
        - id
        - title
        - createdAt
    AnthropicMessage:
      type: object
      properties:
        id:
          type: integer
        conversationId:
          type: integer
        role:
          type: string
        content:
          type: string
        createdAt:
          type: string
          format: date-time
      required:
        - id
        - conversationId
        - role
        - content
        - createdAt
    AnthropicConversationInput:
      type: object
      properties:
        title:
          type: string
      required:
        - title
    AnthropicMessageInput:
      type: object
      properties:
        content:
          type: string
      required:
        - content
    AnthropicConversationWithMessages:
      type: object
      properties:
        id:
          type: integer
        title:
          type: string
        createdAt:
          type: string
          format: date-time
        messages:
          type: array
          items:
            $ref: "#/components/schemas/AnthropicMessage"
      required:
        - id
        - title
        - createdAt
        - messages
    AnthropicError:
      type: object
      properties:
        error:
          type: string
      required:
        - error
    TTSRequest:
      type: object
      properties:
        text:
          type: string
        voiceId:
          type: string
        gender:
          type: string
      required:
        - text
    TTSResponse:
      type: object
      properties:
        audio:
          type: string
          description: Base64-encoded audio data
        contentType:
          type: string
      required:
        - audio
        - contentType
    SageChatMessage:
      type: object
      properties:
        role:
          type: string
        content:
          type: string
      required:
        - role
        - content
    SageChatInput:
      type: object
      properties:
        history:
          type: array
          items:
            $ref: "#/components/schemas/SageChatMessage"
        userMessage:
          type: ["string", "null"]
      required:
        - history
    SageChatResult:
      type: object
      properties:
        reply:
          type: string
        complete:
          type: boolean
      required:
        - reply
        - complete
    TherapistMatch:
      type: object
      properties:
        name:
          type: string
        title:
          type: string
        initials:
          type: string
        color:
          type: string
        textColor:
          type: string
        score:
          type: string
        why:
          type: string
        fits:
          type: array
          items:
            type: string
        profileUrl:
          type: string
        photoUrl:
          type: string
      required:
        - name
        - title
        - initials
        - color
        - textColor
        - score
        - why
        - fits
    TherapyProfile:
      type: object
      properties:
        name:
          type: string
        tagline:
          type: string
        tags:
          type: array
          items:
            type: string
        challenges:
          type: string
        recommendations:
          type: string
        therapistSummary:
          type: string
        therapists:
          type: array
          items:
            $ref: "#/components/schemas/TherapistMatch"
      required:
        - name
        - tagline
        - tags
        - challenges
        - recommendations
        - therapistSummary
        - therapists
    ProfileInput:
      type: object
      properties:
        history:
          type: array
          items:
            $ref: "#/components/schemas/SageChatMessage"
      required:
        - history
    ContactRequestInput:
      type: object
      properties:
        therapistName:
          type: string
        therapistProfileUrl:
          type: string
        userName:
          type: string
        userEmail:
          type: string
        userMessage:
          type: string
        profileSummary:
          type: string
      required:
        - therapistName
        - userName
        - userEmail
    ContactRequestResult:
      type: object
      properties:
        id:
          type: integer
        createdAt:
          type: string
          format: date-time
      required:
        - id
        - createdAt
    ProviderApplicationInput:
      type: object
      properties:
        name:
          type: string
        credentials:
          type: string
        email:
          type: string
        specialty:
          type: string
        modalities:
          type: string
        location:
          type: string
        telehealth:
          type: string
        plan:
          type: string
        message:
          type: string
      required:
        - name
        - credentials
        - email
        - specialty
        - plan
    ProviderApplicationResult:
      type: object
      properties:
        id:
          type: integer
        createdAt:
          type: string
          format: date-time
      required:
        - id
        - createdAt
